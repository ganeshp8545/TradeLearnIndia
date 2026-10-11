'use client';

import {FormEvent, useEffect, useId, useRef, useState} from 'react';

export function CourseRecoveryRequest() {
    const id = useId();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const messageRef = useRef<HTMLParagraphElement>(null);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setMessage('');
        const values = new FormData(event.currentTarget);
        try {
            const response = await fetch('/api/course-access/request', {method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({order_id: values.get('order_id'), email: values.get('email')})});
            const data = await response.json();
            setMessage(data.message ?? data.error ?? 'Please try again later.');
        } catch { setMessage('Unable to request access. Please try again later.'); }
        finally { setBusy(false); }
    }
    useEffect(() => { if (message) messageRef.current?.focus(); }, [message]);
    return <section id="recover" className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-xl font-bold">Recover course access</h2>
        <p className="mt-3 text-sm leading-6">For an expired session or a new device, request a secure link sent to the email registered with your purchase. Your course entitlement does not expire with a browser session.</p>
        <form onSubmit={submit} className="mt-4 space-y-3" aria-busy={busy}>
            <div><label htmlFor={`${id}-order`} className="block text-sm font-bold">Razorpay order reference</label>
                <input id={`${id}-order`} name="order_id" required maxLength={106} placeholder="order_…" autoCapitalize="none" spellCheck={false} className="mt-1 min-h-11 w-full rounded border border-slate-400 px-3 text-slate-900"/></div>
            <div><label htmlFor={`${id}-email`} className="block text-sm font-bold">Registered email address</label>
                <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254} className="mt-1 min-h-11 w-full rounded border border-slate-400 px-3 text-slate-900"/></div>
            <button type="submit" disabled={busy} className="btn btn-primary w-full disabled:opacity-60">{busy ? 'Requesting link…' : 'Email a recovery link'}</button>
            <p role="status" aria-live="polite" tabIndex={-1} ref={messageRef} className="text-sm leading-6">{message}</p>
        </form>
        <p className="mt-4 text-sm leading-6">Lost your order reference or access to your registered email? <a className="font-bold underline" href="/contact">Contact support</a> with your payment receipt or payment reference. Support must verify ownership before changing an email address. Never send card details, passwords, or OTPs.</p>
    </section>;
}

export function CourseRecoveryConfirm() {
    const [token, setToken] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const errorRef = useRef<HTMLParagraphElement>(null);
    useEffect(() => {
        const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get('token');
        if (fragmentToken) setToken(fragmentToken);
        window.history.replaceState(null, '', window.location.pathname);
    }, []);
    useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
    async function confirm() {
        if (busy) return;
        setBusy(true); setError('');
        try {
            const response = await fetch('/api/course-access/verify', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({token})});
            const data = await response.json();
            if (!response.ok) throw new Error(data.error ?? 'Recovery unavailable.');
            window.location.replace('/course-access');
        } catch (caught) { setError(caught instanceof Error ? caught.message : 'Please request another link.'); setBusy(false); }
    }
    return <section className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-slate-900">
        <h1 className="text-2xl font-bold">Confirm course access</h1>
        <p className="mt-3 leading-7">Continue to use your single-use recovery link on this device. Links expire after 30 minutes.</p>
        <button type="button" onClick={confirm} disabled={!token || busy} aria-busy={busy} className="btn btn-primary mt-6 w-full disabled:opacity-60">{busy ? 'Verifying…' : 'Confirm access on this device'}</button>
        <p role="alert" ref={errorRef} tabIndex={-1} className="mt-3 text-sm">{error}</p>
        <a className="mt-4 inline-block underline" href="/course-access#recover">Request a new recovery link</a>
    </section>;
}
