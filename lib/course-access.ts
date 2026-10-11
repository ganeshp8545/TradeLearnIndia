import 'server-only';
import {createHash, createHmac, randomBytes} from 'node:crypto';
import {COURSE_NAME, LEGACY_COURSE_NAME, COURSE_PRICE_INR, COURSE_PRICE_PAISE, COURSE_SLUG, formatINR} from '@/lib/course-pricing';
import {verifyRazorpayOrderSignature} from '@/lib/razorpay-webhook';

export {COURSE_NAME, COURSE_PRICE_INR, COURSE_PRICE_PAISE, COURSE_SLUG, formatINR};

export function getCourseDriveUrl(): URL {
	const configuredUrl = process.env.COURSE_DRIVE_URL;
	if (!configuredUrl) throw new Error('Missing required environment variable: COURSE_DRIVE_URL');
	const destination = new URL(configuredUrl);
	if (destination.protocol !== 'https:' || destination.hostname !== 'drive.google.com') {
		throw new Error('COURSE_DRIVE_URL must be an HTTPS Google Drive URL');
	}
	return destination;
}

export function getCoursePricePaise(): number {
	const testMode = process.env.COURSE_TEST_MODE;
	if (testMode !== 'true' && testMode !== undefined && testMode !== 'false') {
		throw new Error('COURSE_TEST_MODE must be "true" or "false"');
	}

	const razorpayKeyId = process.env.RAZORPAY_KEY_ID ?? '';
	if ((testMode === 'true' && razorpayKeyId.startsWith('rzp_live_'))
		|| (testMode !== 'true' && razorpayKeyId.startsWith('rzp_test_'))) {
		throw new Error('COURSE_TEST_MODE does not match the Razorpay key mode');
	}

	return COURSE_PRICE_PAISE;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export type CourseAccessTimingEvent = {
	operation: string;
	durationMs: number;
	success: boolean;
};

export type CourseAccessTimingObserver = (event: CourseAccessTimingEvent) => void;

export type CoursePayment = {
	id: string;
	razorpay_payment_link_id: string | null;
	razorpay_payment_id: string | null;
	razorpay_order_id: string | null;
	customer_name: string | null;
	customer_email: string | null;
	amount: number;
	currency: string | null;
	payment_status: PaymentStatus;
	course_name: string;
	course_slug: string | null;
	course_access_granted: boolean;
	created_at: string;
	updated_at?: string | null;
	capture_verified_at?: string | null;
	access_token_hash?: string | null;
	access_token_expires_at?: string | null;
	access_token_used_at?: string | null;
	access_session_hash?: string | null;
	access_session_expires_at?: string | null;
};

type RazorpayOrder = {
	receipt?: string;
	id?: string;
	amount?: number;
	currency?: string;
	notes?: {course?: string};
};

type RazorpayPayment = {
	id?: string;
	order_id?: string | null;
	amount?: number;
	currency?: string;
	status?: string;
	email?: string | null;
	contact?: string | null;
	notes?: {course?: string};
};

function accessSecret(): string {
    const secret = requiredEnv('COURSE_ACCESS_SECRET');
    if (Buffer.byteLength(secret) < 32) throw new Error('COURSE_ACCESS_SECRET must contain at least 32 bytes');
    return secret;
}

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

export function hashAccessToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function createAccessToken(): string {
	return randomBytes(32).toString('base64url');
}

async function supabaseRequest<T>(
	path: string,
	init: RequestInit = {},
	timing?: CourseAccessTimingObserver,
	operation = 'supabase_request',
): Promise<T> {
	const startedAt = Date.now();
	let success = false;
	try {
	const baseUrl = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
	const serviceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
	const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
		...init,
		cache: 'no-store',
		signal: AbortSignal.timeout(10000),
		headers: {
			apikey: serviceKey,
			Authorization: `Bearer ${serviceKey}`,
			'Content-Type': 'application/json',
			...init.headers,
		},
	});
	if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
	const result = response.status === 204 ? undefined as T : await response.json() as T;
	success = true;
	return result;
	} finally {
		timing?.({operation, durationMs: Date.now() - startedAt, success});
	}
}

async function fetchRazorpay<T>(
	resource: string,
	timing?: CourseAccessTimingObserver,
	operation = 'razorpay_request',
): Promise<T> {
	const startedAt = Date.now();
	let success = false;
	try {
	const keyId = requiredEnv('RAZORPAY_KEY_ID');
	const keySecret = requiredEnv('RAZORPAY_KEY_SECRET');
	const credentials = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
	const response = await fetch(`https://api.razorpay.com/v1/${resource}`, {
		headers: {Authorization: `Basic ${credentials}`},
		cache: 'no-store',
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok) throw new Error(`Razorpay API request failed (${response.status}) for ${resource}`);
	const result = await response.json() as T;
	success = true;
	return result;
	} finally {
		timing?.({operation, durationMs: Date.now() - startedAt, success});
	}
}

async function rpc<T>(name: string, body: object, timing?: CourseAccessTimingObserver): Promise<T> {
    return supabaseRequest<T>(`rpc/${name}`, {method: 'POST', body: JSON.stringify(body)}, timing, name);
}

type PaymentInput = {
    paymentId: string | null; orderId: string | null; name: string | null; email: string | null;
    amount: number; currency: string; status: PaymentStatus; courseSlug?: string;
};

async function persistPayment(payment: PaymentInput, captured: boolean, timing?: CourseAccessTimingObserver): Promise<CoursePayment | null> {
    const rows = await rpc<CoursePayment[]>('record_course_payment_v2', {
        p_order_id: payment.orderId, p_payment_id: payment.paymentId,
        p_customer_name: payment.name, p_customer_email: payment.email,
        p_amount: payment.amount, p_currency: payment.currency,
        p_payment_status: payment.status, p_capture_verified: captured,
    }, timing);
    return rows[0] ?? null;
}

// Success writes are private to reconciliation with the authenticated provider API.
export async function recordCoursePayment(payment: Omit<PaymentInput, 'status'> & {status: 'pending' | 'failed'}): Promise<void> {
    if (payment.status !== 'pending' && payment.status !== 'failed') throw new Error('Capture verification required');
    const recorded = await persistPayment(payment, false);
    if (!recorded || recorded.razorpay_order_id !== payment.orderId
        || recorded.amount !== payment.amount || recorded.currency !== payment.currency) {
        throw new Error('Payment record was not confirmed');
    }
}

export async function getPaymentByOrderId(orderId: string, timing?: CourseAccessTimingObserver): Promise<CoursePayment | null> {
    if (!/^order_[A-Za-z0-9]{1,100}$/.test(orderId)) return null;
    const query = new URLSearchParams({select: '*', razorpay_order_id: `eq.${orderId}`, limit: '1'});
    const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`, {}, timing);
    return rows[0] ?? null;
}

function isCoursePurchase(payment: CoursePayment): boolean {
    return (payment.course_name === COURSE_NAME || payment.course_name === LEGACY_COURSE_NAME)
        && (payment.course_slug === COURSE_SLUG || payment.course_slug === null)
        && (payment.currency === 'INR' || payment.currency === null)
        && Number.isSafeInteger(payment.amount) && payment.amount > 0;
}

// The only path which records new capture evidence. Both callbacks and webhooks
// use freshly fetched provider data, never a browser or event status field.
export async function reconcileCoursePayment(orderId: string, paymentId: string, timing?: CourseAccessTimingObserver): Promise<CoursePayment | null> {
    if (!/^order_[A-Za-z0-9]{1,100}$/.test(orderId) || !/^pay_[A-Za-z0-9]{1,100}$/.test(paymentId)) return null;
    const stored = await getPaymentByOrderId(orderId, timing);
    if (stored && !isCoursePurchase(stored)) return null;
    const [order, payment] = await Promise.all([
        fetchRazorpay<RazorpayOrder>(`orders/${orderId}`, timing, 'razorpay_order_lookup'),
        fetchRazorpay<RazorpayPayment>(`payments/${paymentId}`, timing, 'razorpay_payment_lookup'),
    ]);
    // Historical successful purchases retain their recorded price. They still
    // need exact provider amount/currency/identity/capture validation.
    const historical = stored?.payment_status === 'success' && stored.course_access_granted;
    const amount = historical ? stored.amount : getCoursePricePaise();
    if (order.id !== orderId || order.amount !== amount || order.currency !== 'INR'
        || (stored && stored.amount !== amount)
        || (order.notes?.course !== COURSE_SLUG && !(historical && !order.notes?.course))
        || (!stored && !order.receipt?.startsWith('course_'))
        || payment.id !== paymentId || payment.order_id !== orderId
        || payment.amount !== amount || payment.currency !== 'INR'
        || (historical && stored.razorpay_payment_id !== paymentId)) return null;
    if (payment.status === 'failed') {
        await persistPayment({orderId, paymentId, name: null, email: null, amount, currency: 'INR', status: 'failed'}, false, timing);
        return null;
    }
    if (payment.status !== 'captured') return null;
    return persistPayment({orderId, paymentId, name: null, email: payment.email ?? null,
        amount, currency: 'INR', status: 'success'}, true, timing);
}

export async function ensureCapturedPurchase(payment: CoursePayment, timing?: CourseAccessTimingObserver): Promise<CoursePayment | null> {
    if (!isCoursePurchase(payment) || payment.payment_status !== 'success' || !payment.course_access_granted) return null;
    if (payment.capture_verified_at) return payment;
    if (!payment.razorpay_order_id || !payment.razorpay_payment_id) return null;
    return reconcileCoursePayment(payment.razorpay_order_id, payment.razorpay_payment_id, timing);
}

export async function verifyAndGrantCourseAccess({orderId, paymentId, signature}: {
    orderId: string; paymentId: string; signature: string;
}, timing?: CourseAccessTimingObserver): Promise<{status: 'success' | 'pending' | 'failed' | 'not_found'; sessionToken?: string}> {
    if (!/^order_[A-Za-z0-9]{1,100}$/.test(orderId) || !/^pay_[A-Za-z0-9]{1,100}$/.test(paymentId)) return {status: 'not_found'};
    if (!verifyRazorpayOrderSignature(orderId, paymentId, signature, requiredEnv('RAZORPAY_KEY_SECRET'))) return {status: 'failed'};
    const payment = await reconcileCoursePayment(orderId, paymentId, timing);
    if (!payment?.capture_verified_at) return {status: 'pending'};
    // Retries (including parallel callbacks and lost HTTP responses) produce the
    // same session, without extending its original 24-hour expiry.
    const sessionToken = createHmac('sha256', accessSecret())
        .update(`checkout-session:v1:${orderId}:${paymentId}`).digest('base64url');
    const issued = await rpc<boolean>('issue_course_credential', {
        p_payment_id: payment.id, p_hash: hashAccessToken(sessionToken), p_kind: 'session', p_checkout: true,
    }, timing);
    return issued ? {status: 'success', sessionToken} : {status: 'not_found'};
}

export async function getPaymentByTokenHash(
    column: 'access_token_hash' | 'access_session_hash', tokenHash: string,
    validityColumn: 'access_token_expires_at' | 'access_session_expires_at', timing?: CourseAccessTimingObserver,
): Promise<CoursePayment | null> {
    if (!/^[a-f0-9]{64}$/.test(tokenHash)) return null;
    const rows = await rpc<CoursePayment[]>('lookup_course_credential', {
        p_hash: tokenHash, p_kind: column === 'access_session_hash' ? 'session' : 'recovery',
    }, timing);
    if (rows[0]) return ensureCapturedPurchase(rows[0], timing);
    const query = new URLSearchParams({select: '*', [column]: `eq.${tokenHash}`,
        [validityColumn]: `gt.${new Date().toISOString()}`, payment_status: 'eq.success', course_access_granted: 'eq.true', limit: '1'});
    const legacy = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`, {}, timing);
    return legacy[0] ? ensureCapturedPurchase(legacy[0], timing) : null;
}

export async function getValidCourseAccessRecord(token?: string | null, sessionToken?: string | null, timing?: CourseAccessTimingObserver): Promise<CoursePayment | null> {
    if (sessionToken && /^[A-Za-z0-9_-]{32,128}$/.test(sessionToken)) {
        const payment = await getPaymentByTokenHash('access_session_hash', hashAccessToken(sessionToken), 'access_session_expires_at', timing);
        if (payment) return payment;
    }
    if (token && /^[A-Za-z0-9_-]{32,128}$/.test(token)) {
        return getPaymentByTokenHash('access_token_hash', hashAccessToken(token), 'access_token_expires_at', timing);
    }
    return null;
}

export async function exchangeAccessTokenForSession(tokenHash: string, sessionHash: string, timing?: CourseAccessTimingObserver): Promise<CoursePayment | null> {
    const purchase = await getPaymentByTokenHash('access_token_hash', tokenHash, 'access_token_expires_at', timing);
    if (!purchase) return null;
    const rows = await rpc<CoursePayment[]>('exchange_course_credential', {p_hash: tokenHash, p_session_hash: sessionHash}, timing);
    return rows[0] ?? null;
}

export function isAllowedCourseOrigin(request: Request): boolean {
    const configured = process.env.APP_BASE_URL;
    if (!configured) return false;
    try { return request.headers.get('origin') === new URL(configured).origin; } catch { return false; }
}

export async function takeCourseRateLimit(scope: string, identity: string, limit: number, seconds: number): Promise<boolean> {
    const key = createHmac('sha256', accessSecret()).update(`${scope}:${identity}`).digest('hex');
    return rpc<boolean>('take_course_rate_limit', {p_key: key, p_limit: limit, p_seconds: seconds});
}

export async function sendCourseAccessEmail(payment: CoursePayment): Promise<void> {
    const verified = await ensureCapturedPurchase(payment);
    if (!verified?.customer_email) return;
    // Validate configuration before issuing; existing sessions and links are untouched.
    const apiKey = requiredEnv('RESEND_API_KEY');
    const from = requiredEnv('COURSE_ACCESS_FROM_EMAIL');
    const appUrl = new URL(requiredEnv('APP_BASE_URL'));
    if (appUrl.protocol !== 'https:' && process.env.NODE_ENV !== 'development') throw new Error('HTTPS recovery origin required');
    const token = createAccessToken();
    const issued = await rpc<boolean>('issue_course_credential', {p_payment_id: verified.id, p_hash: hashAccessToken(token), p_kind: 'recovery'});
    if (!issued) throw new Error('Recovery credential unavailable');
    // Fragment avoids putting the secret in HTTP request URLs and access logs.
    const accessUrl = `${appUrl.origin}/course-access/recover#token=${token}`;
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: AbortSignal.timeout(10000),
        headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({from, to: [verified.customer_email], subject: 'Your course access recovery',
            text: `Confirm course access using this single-use link within 30 minutes: ${accessUrl}\nIf you did not request it, ignore this email. Existing sessions are unaffected.`}),
    });
    if (!response.ok) throw new Error('Course access email delivery unavailable');
}
