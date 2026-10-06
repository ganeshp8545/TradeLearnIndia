'use client';

import {useState} from 'react';
import {ArrowRight, LoaderCircle} from 'lucide-react';

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

export function RazorpayCheckoutButton({label, className = 'btn btn-primary w-full sm:w-auto'}: {label: string; className?: string}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureRazorpayScript() {
    if (typeof window === 'undefined') return;
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay Checkout script.'));
      document.body.appendChild(script);
    });
  }

  async function handleCheckout() {
    setError(null);
    setIsLoading(true);
    try {
      await ensureRazorpayScript();
      const response = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      });
      const data = await response.json() as {error?: string; orderId?: string; amount?: number; currency?: string; keyId?: string};
      if (!response.ok || !data.orderId || !data.keyId || typeof data.amount !== 'number' || !Number.isInteger(data.amount) || data.currency !== 'INR') {
        throw new Error(data.error ?? 'Unable to create Razorpay order.');
      }
      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout is not available.');
      }
      const razorpay = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'CampusEduX',
        description: 'Share Market Complete Course',
        order_id: data.orderId,
        theme: {color: '#22c55e'},
        handler: (paymentResponse) => {
          sessionStorage.setItem('razorpay_payment_callback', JSON.stringify(paymentResponse));
          window.location.assign('/payment/return');
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      });
      razorpay.open();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Payment could not be started.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return <>
    <button type="button" className={className} onClick={handleCheckout} disabled={isLoading}>
      {isLoading ? <span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin" size={16}/>Processing...</span> : <span className="inline-flex items-center gap-2">{label}<ArrowRight size={16}/></span>}
    </button>
    {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
  </>;
}
