'use client';

import {useEffect, useState} from 'react';
import {ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle} from 'lucide-react';

type Callback = {
	razorpay_payment_id: string;
	razorpay_order_id: string;
	razorpay_signature: string;
};

type ViewStatus = 'success' | 'failed' | 'pending' | 'not_found' | 'server_error' | 'loading';

export function PaymentReturn({callback}: {callback: Callback}) {
	const [status, setStatus] = useState<ViewStatus>('loading');

	useEffect(() => {
		if (!callback.razorpay_order_id || !callback.razorpay_payment_id || !callback.razorpay_signature) {
			setStatus('not_found');
			return;
		}
		let active = true;
		let attempts = 0;
		const check = async () => {
			try {
				const response = await fetch('/api/razorpay/verify', {
					method: 'POST',
					headers: {'Content-Type': 'application/json'},
					body: JSON.stringify(callback),
					cache: 'no-store',
				});
				const result = await response.json() as {status?: ViewStatus; error?: string};
				if (!active) return;
				setStatus(result.status ?? (response.ok ? 'success' : 'failed'));
				if (result.status === 'success') {
					window.location.replace('/course-access');
				} else if (result.status === 'pending' && attempts++ < 20) {
					window.setTimeout(check, 2500);
				}
			} catch {
				if (active) setStatus('server_error');
			}
		};
		void check();
		return () => {active = false;};
	}, [callback]);

	const title = status === 'success' ? 'Payment Successful'
		: status === 'failed' ? 'Payment Failed'
			: status === 'not_found' ? 'Payment Not Found'
				: status === 'server_error' ? 'Verification temporarily unavailable'
					: status === 'loading' ? 'Processing Payment...'
						: 'Payment verification pending';
	const description = status === 'success' ? '₹499 Payment Verified. Your Share Market Complete Course is ready.'
		: status === 'failed' ? 'Payment was not completed.'
			: status === 'not_found' ? 'We could not verify a valid Razorpay checkout response for this payment.'
				: status === 'server_error' ? 'We could not check payment status right now. Please refresh this page shortly.'
					: status === 'loading' ? 'Please wait while we securely verify your payment with Razorpay.'
						: 'Payment verification is still processing. This page will check for updates automatically.';

	return <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-900 sm:py-16">
		<div className="mx-auto max-w-xl">
			<a href="/courses/share-market-complete-course" className="text-sm font-bold text-green-800">TradeLearnIndia</a>
			<section aria-live="polite" className="mt-8 rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
				{status === 'loading' || status === 'pending'
					? <LoaderCircle className="mb-5 animate-spin text-green-700" aria-label="Checking payment" size={30}/>
					: status === 'success'
						? <CheckCircle2 className="mb-5 text-green-700" size={30}/>
						: <CircleAlert className="mb-5 text-amber-600" size={30}/>}
				<h1 className="text-3xl font-black">{title}</h1>
				<p className="muted mt-3 leading-7">{description}</p>
				{status === 'success' && <p className="mt-4 font-bold">Share Market Complete Course</p>}
				<a href="/courses/share-market-complete-course" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-700"><ArrowLeft size={16}/> Return to course page</a>
			</section>
		</div>
	</main>;
}