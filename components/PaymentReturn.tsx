'use client';

import {useEffect, useState, type FormEvent} from 'react';
import {ArrowLeft, CheckCircle2, CircleAlert, LoaderCircle} from 'lucide-react';
import type {PaymentStatus} from '@/lib/course-access';

type ViewStatus = PaymentStatus | 'not_found' | 'server_error' | 'loading';

export function PaymentReturn({paymentLinkId}: {paymentLinkId: string}) {
	const [status, setStatus] = useState<ViewStatus>('loading');
	const [email, setEmail] = useState('');
	const [message, setMessage] = useState('');
	const [sending, setSending] = useState(false);

	useEffect(() => {
		if (!/^plink_[A-Za-z0-9]+$/.test(paymentLinkId)) {
			setStatus('not_found');
			return;
		}
		let active = true;
		let attempts = 0;
		const check = async () => {
			try {
				const response = await fetch(`/api/payments/status?payment_link_id=${encodeURIComponent(paymentLinkId)}`, {cache: 'no-store'});
				const result = await response.json() as {status?: ViewStatus};
				if (!active) return;
				const waitingForFirstWebhook = result.status === 'not_found' && attempts < 10;
				setStatus(waitingForFirstWebhook ? 'pending' : result.status ?? 'server_error');
				if ((result.status === 'pending' || waitingForFirstWebhook) && attempts++ < 10) {
					window.setTimeout(check, 3000);
				}
			} catch {
				if (active) setStatus('server_error');
			}
		};
		void check();
		return () => {active = false;};
	}, [paymentLinkId]);

	async function requestAccess(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSending(true);
		setMessage('');
		try {
			const response = await fetch('/api/course-access/request', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({payment_link_id: paymentLinkId, email}),
			});
			const result = await response.json() as {error?: string; sent?: boolean};
			setMessage(response.ok ? 'Secure access link sent. Check your inbox.' : result.error ?? 'Server error. Please try again.');
		} catch {
			setMessage('Server error. Please try again later.');
		} finally {
			setSending(false);
		}
	}

	const title = status === 'success' ? '🎉 Payment Successful'
		: status === 'failed' ? 'Payment failed'
			: status === 'not_found' ? 'Payment not found'
				: status === 'server_error' ? 'Server error'
					: 'Payment verification pending';
	const description = status === 'success' ? 'Your Share Market Complete Course is ready.'
		: status === 'failed' ? 'The payment was not completed, so course access has not been granted.'
			: status === 'not_found' ? 'We have not received a verified payment for this reference yet. If you just paid, verification may take a minute.'
				: status === 'server_error' ? 'We could not check payment status right now. Please refresh this page shortly.'
					: 'We are waiting for Razorpay to confirm your payment. This page checks for updates automatically.';

	return <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-900">
		<div className="mx-auto max-w-2xl">
			<a href="/courses/share-market-complete-course" className="text-sm font-bold text-green-800">CampusEduX</a>
			<section className="mt-8 rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
				{status === 'loading' && <LoaderCircle className="mb-4 animate-spin text-green-700" aria-label="Checking payment"/>}
				{status === 'success' ? <CheckCircle2 className="mb-4 text-green-700" size={30}/> : status !== 'loading' && <CircleAlert className="mb-4 text-amber-600" size={30}/>}
				<h1 className="text-3xl font-black">{title}</h1>
				<p className="muted mt-3 leading-7">{description}</p>
				{status === 'success' && <form onSubmit={requestAccess} className="mt-8 border-t border-slate-200 pt-6">
					<label htmlFor="payment-email" className="block text-sm font-bold">Email used for payment</label>
					<div className="mt-2 flex flex-col gap-3 sm:flex-row">
						<input id="payment-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3" placeholder="you@example.com"/>
						<button type="submit" disabled={sending} className="btn btn-primary disabled:opacity-60">{sending ? 'Sending...' : 'Send secure access link'}</button>
					</div>
					{message && <p role="status" className="mt-3 text-sm font-semibold text-slate-700">{message}</p>}
				</form>}
				<a href="/courses/share-market-complete-course" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-slate-700"><ArrowLeft size={16}/> Return to course page</a>
			</section>
		</div>
	</main>;
}