'use client';

import {useEffect, useId, useRef, useState} from 'react';
import {ArrowRight, LoaderCircle} from 'lucide-react';
import {COURSE_NAME, COURSE_PRICE_PAISE, COURSE_VIDEO_COUNT, formatINR, COURSE_PRICE_INR} from '@/lib/course-pricing';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: {error?: {description?: string}}) => void) => void;
    };
  }

  interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id?: string;
    handler?: (response: {
      razorpay_payment_id: string;
      razorpay_order_id: string;
      razorpay_signature: string;
    }) => void;
    theme?: {color?: string};
    prefill?: {email?: string};
    modal?: {ondismiss?: () => void};
  }
}

let checkoutScript: Promise<void> | undefined;
let checkoutBusy = false;
function ensureRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timeout);
      script.remove(); checkoutScript = undefined;
      reject(new Error('Checkout could not load. Check your connection and try again.'));
    }
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { window.clearTimeout(timeout); if (window.Razorpay) resolve(); else fail(); };
    script.onerror = fail;
    document.body.appendChild(script);
  });
  return checkoutScript;
}

export function RazorpayCheckoutButton({label, className = 'btn btn-primary w-full sm:w-auto'}: {label: string; className?: string}) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checkoutInProgress = useRef(false);
  const callbackReceived = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const acknowledgmentId = useId();
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  async function handleCheckout() {
    if (!acknowledged || paymentPending || checkoutInProgress.current || checkoutBusy) return;
    checkoutInProgress.current = true;
    callbackReceived.current = false;
    checkoutBusy = true;
    setError(null);
    setIsLoading(true);
    try {
      await ensureRazorpayScript();
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      });
      const data = await response.json() as {error?: string; requestId?: string; orderId?: string; amount?: number; currency?: string; keyId?: string};
      if (!response.ok || !data.orderId || !data.keyId || data.amount !== COURSE_PRICE_PAISE || data.currency !== 'INR') {
        throw new Error(`${data.error ?? 'Unable to create Razorpay order.'}${data.requestId ? ` Reference: ${data.requestId}.` : ''}`);
      }
      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout is not available.');
      }
      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'CampusEduX',
        description: COURSE_NAME,
        order_id: data.orderId,
        theme: {color: '#22c55e'},
        handler: (paymentResponse) => {
          callbackReceived.current = true;
          try {
            sessionStorage.setItem('razorpay_payment_callback', JSON.stringify(paymentResponse));
            window.location.assign('/payment/return');
          } catch {
            // Private browsing can disable storage. Verify once without storing
            // credentials in a URL; recovery remains available after capture.
            void fetch('/api/razorpay/verify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(paymentResponse)})
              .then(response => response.json()).then(result => {
                if (result.status === 'success') window.location.assign('/course-access');
                else throw new Error('Capture pending');
              }).catch(() => {
                setPaymentPending(true);
                setError(`Payment verification is pending. Do not pay again. Recover access from the course access page or contact support with order ${paymentResponse.razorpay_order_id}.`);
              }).finally(() => { setIsLoading(false); });
          }
        },
        modal: {
          ondismiss: () => {
            if (callbackReceived.current) return;
            checkoutInProgress.current = false;
            checkoutBusy = false;
            setIsLoading(false);
            window.setTimeout(() => buttonRef.current?.focus(), 0);
          },
        },
      });
      razorpay.on('payment.failed', () => {
        setError('Payment was not completed. Check your payment status before trying again. If you were charged, use access recovery or contact support.');
      });
      razorpay.open();
    } catch (caughtError) {
      checkoutInProgress.current = false;
      checkoutBusy = false;
      setIsLoading(false);
      const message = caughtError instanceof Error ? caughtError.message : 'Payment could not be started.';
      setError(message);
    }
  }

  return <div className="w-full min-w-0 max-w-xl" aria-busy={isLoading}>
    <div className="checkout-summary"><strong>{COURSE_NAME}</strong><span>{COURSE_VIDEO_COUNT} pre-recorded videos · Lifetime access <a href="/terms">subject to Terms</a></span><span className="checkout-total"><span>Total payable</span><strong>{formatINR(COURSE_PRICE_INR)} INR</strong></span></div>
    <p className="checkout-policy">Generally non-refundable once valid access is provided, subject to applicable consumer rights. <a href="/refund-policy">Read the refund policy</a>.</p>
    <div className="checkout-consent"><input aria-describedby={`${acknowledgmentId}-hint`} disabled={isLoading} id={acknowledgmentId} type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0"/><label htmlFor={acknowledgmentId}>I have read and accept the <a href="/terms">Terms &amp; Conditions</a> and <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.</label></div>
    <p id={`${acknowledgmentId}-hint`} className="checkout-hint">Accept the policies to continue.</p>
    <button ref={buttonRef} aria-describedby={`${acknowledgmentId}-hint`} type="button" className={`${className} disabled:cursor-not-allowed disabled:opacity-60`} onClick={handleCheckout} disabled={isLoading || paymentPending || !acknowledged}>
      {isLoading ? <span className="inline-flex items-center gap-2"><LoaderCircle aria-hidden="true" className="animate-spin" size={16}/>Processing...</span> : <span className="inline-flex items-center gap-2">{label}<ArrowRight aria-hidden="true" size={16}/></span>}
    </button>
    <span role="status" className="sr-only">{isLoading ? 'Opening secure checkout. Please wait.' : ''}</span>
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">{error} <a className="underline" href="/course-access#recover">Recover access</a> · <button type="button" className="underline" onClick={() => setError(null)}>Dismiss and retry</button></p>}
  </div>;
}
