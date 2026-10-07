import 'server-only';
import {createHash, randomBytes} from 'node:crypto';
import {verifyRazorpayOrderSignature} from '@/lib/razorpay-webhook';

export const COURSE_NAME = 'Share Market Complete Course';
export const COURSE_SLUG = 'share-market-complete-course';
export const COURSE_PRICE_INR = 1;
export const TEST_COURSE_PRICE_INR = 1;

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

	return (testMode === 'true' ? TEST_COURSE_PRICE_INR : COURSE_PRICE_INR) * 100;
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
	access_token_hash?: string | null;
	access_token_expires_at?: string | null;
	access_token_used_at?: string | null;
	access_session_hash?: string | null;
	access_session_expires_at?: string | null;
};

type RazorpayOrder = {
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
	});
	if (!response.ok) throw new Error(`Razorpay API request failed (${response.status}) for ${resource}`);
	const result = await response.json() as T;
	success = true;
	return result;
	} finally {
		timing?.({operation, durationMs: Date.now() - startedAt, success});
	}
}

export async function recordCoursePayment(payment: {
	linkId?: string | null;
	paymentId: string | null;
	orderId: string | null;
	name: string | null;
	email: string | null;
	amount: number;
	currency: string;
	status: PaymentStatus;
	courseSlug?: string;
}, timing?: CourseAccessTimingObserver): Promise<void> {
	const payload = {
		razorpay_payment_link_id: payment.linkId ?? null,
		razorpay_payment_id: payment.paymentId ?? null,
		razorpay_order_id: payment.orderId ?? null,
		customer_name: payment.name,
		customer_email: payment.email?.toLowerCase() ?? null,
		amount: payment.amount,
		currency: payment.currency,
		payment_status: payment.status,
		course_name: COURSE_NAME,
		course_slug: payment.courseSlug ?? COURSE_SLUG,
		course_access_granted: payment.status === 'success',
		updated_at: new Date().toISOString(),
	};
	await supabaseRequest('rpc/record_course_payment', {
		method: 'POST',
		body: JSON.stringify({
			p_payment_link_id: payload.razorpay_payment_link_id,
			p_payment_id: payload.razorpay_payment_id,
			p_order_id: payload.razorpay_order_id,
			p_customer_name: payload.customer_name,
			p_customer_email: payload.customer_email,
			p_amount: payload.amount,
			p_payment_status: payload.payment_status,
			p_course_name: payload.course_name,
			p_currency: payload.currency,
			p_course_slug: payload.course_slug,
		}),
	}, timing, 'supabase_payment_record');
}

export async function getPaymentByOrderId(orderId: string, timing?: CourseAccessTimingObserver, operation = 'supabase_payment_lookup'): Promise<CoursePayment | null> {
	const query = new URLSearchParams({
		select: '*',
		razorpay_order_id: `eq.${orderId}`,
		limit: '1',
	});
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`, {}, timing, operation);
	return rows[0] ?? null;
}

export async function getPaymentByPaymentId(paymentId: string): Promise<CoursePayment | null> {
	const query = new URLSearchParams({
		select: '*',
		razorpay_payment_id: `eq.${paymentId}`,
		limit: '1',
	});
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`);
	return rows[0] ?? null;
}

export async function getPaymentByTokenHash(
	column: 'access_token_hash' | 'access_session_hash',
	tokenHash: string,
	validityColumn: 'access_token_expires_at' | 'access_session_expires_at',
	timing?: CourseAccessTimingObserver,
): Promise<CoursePayment | null> {
	const query = new URLSearchParams({
		select: '*',
		[column]: `eq.${tokenHash}`,
		[validityColumn]: `gt.${new Date().toISOString()}`,
		payment_status: 'eq.success',
		course_access_granted: 'eq.true',
		amount: `eq.${getCoursePricePaise()}`,
		course_name: `eq.${COURSE_NAME}`,
		limit: '1',
	});
	const operation = column === 'access_token_hash' ? 'supabase_raw_token_lookup' : 'supabase_session_lookup';
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`, {}, timing, operation);
	return rows[0] ?? null;
}

export async function getValidCourseAccessRecord(
	token?: string | null,
	sessionToken?: string | null,
	timing?: CourseAccessTimingObserver,
): Promise<CoursePayment | null> {
	if (token) {
		const payment = await getPaymentByTokenHash('access_token_hash', hashAccessToken(token), 'access_token_expires_at', timing);
		if (payment) return payment;
	}
	if (sessionToken) {
		return await getPaymentByTokenHash('access_session_hash', hashAccessToken(sessionToken), 'access_session_expires_at', timing);
	}
	return null;
}

export async function verifyAndGrantCourseAccess({
	orderId,
	paymentId,
	signature,
}: {
	orderId: string;
	paymentId: string;
	signature: string;
}, timing?: CourseAccessTimingObserver): Promise<{status: 'success' | 'pending' | 'failed' | 'not_found'; accessToken?: string; payment?: CoursePayment}> {
	if (!orderId || !paymentId || !signature) {
		return {status: 'not_found'};
	}

	const storedPayment = await getPaymentByOrderId(orderId, timing);
	if (!storedPayment || storedPayment.razorpay_order_id !== orderId) {
		return {status: 'pending'};
	}

	if (!verifyRazorpayOrderSignature(orderId, paymentId, signature, requiredEnv('RAZORPAY_KEY_SECRET'))) {
		return {status: 'failed'};
	}

	const expectedAmount = getCoursePricePaise();
	const [order, payment] = await Promise.all([
		fetchRazorpay<RazorpayOrder>(`orders/${encodeURIComponent(orderId)}`, timing, 'razorpay_order_lookup'),
		fetchRazorpay<RazorpayPayment>(`payments/${encodeURIComponent(paymentId)}`, timing, 'razorpay_payment_lookup'),
	]);

	const orderMatches = order.id === orderId
		&& order.amount === expectedAmount
		&& order.currency === 'INR'
		&& (order.notes?.course ?? COURSE_SLUG) === COURSE_SLUG
		&& storedPayment.amount === expectedAmount
		&& storedPayment.currency === 'INR'
		&& storedPayment.course_name === COURSE_NAME
		&& storedPayment.course_slug === COURSE_SLUG;
	const paymentMatches = payment.id === paymentId
		&& payment.order_id === orderId
		&& payment.amount === expectedAmount
		&& payment.currency === 'INR'
		&& (payment.status === 'captured' || payment.status === 'authorized');

	if (!orderMatches || !paymentMatches) {
		return {status: 'pending'};
	}

	await recordCoursePayment({
		orderId,
		paymentId,
		name: payment.contact ?? null,
		email: payment.email ?? null,
		amount: payment.amount ?? expectedAmount,
		currency: payment.currency ?? 'INR',
		status: 'success',
		courseSlug: COURSE_SLUG,
	}, timing);

	const finalPayment = await getPaymentByOrderId(orderId, timing, 'supabase_payment_lookup_after_record');
	const accessToken = await grantCourseAccessToken(orderId, paymentId, timing);
	if (!accessToken || !finalPayment) {
		return {status: 'pending'};
	}

	return {status: 'success', accessToken, payment: finalPayment};
}

export async function grantCourseAccessToken(orderId: string, paymentId: string, timing?: CourseAccessTimingObserver): Promise<string | null> {
	const token = createAccessToken();
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
	const query = new URLSearchParams({
		select: 'id',
		razorpay_order_id: `eq.${orderId}`,
		razorpay_payment_id: `eq.${paymentId}`,
		payment_status: 'eq.success',
		course_access_granted: 'eq.true',
		amount: `eq.${getCoursePricePaise()}`,
		course_name: `eq.${COURSE_NAME}`,
		and: `(or(access_token_hash.is.null,access_token_expires_at.lt.${new Date().toISOString()}))`,
	});
	const rows = await supabaseRequest<Array<{id: string}>>(`course_payments?${query}`, {
		method: 'PATCH',
		headers: {Prefer: 'return=representation'},
		body: JSON.stringify({
			access_token_hash: hashAccessToken(token),
			access_token_expires_at: expiresAt,
			access_token_used_at: null,
			access_session_hash: null,
			access_session_expires_at: null,
		}),
	}, timing, 'supabase_access_token_creation');
	return rows.length ? token : null;
}

export async function consumeAccessCredential(
	column: 'access_token_hash' | 'access_session_hash',
	validityColumn: 'access_token_expires_at' | 'access_session_expires_at',
	tokenHash: string,
): Promise<CoursePayment | null> {
	const query = new URLSearchParams({
		select: '*',
		[column]: `eq.${tokenHash}`,
		[validityColumn]: `gt.${new Date().toISOString()}`,
		payment_status: 'eq.success',
		course_access_granted: 'eq.true',
		amount: `eq.${getCoursePricePaise()}`,
		course_name: `eq.${COURSE_NAME}`,
	});
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`, {
		method: 'PATCH',
		headers: {Prefer: 'return=representation'},
		body: JSON.stringify({
			[column]: null,
			[validityColumn]: null,
			access_token_used_at: new Date().toISOString(),
		}),
	});
	return rows[0] ?? null;
}

export async function exchangeAccessTokenForSession(
	tokenHash: string,
	sessionHash: string,
	timing?: CourseAccessTimingObserver,
): Promise<CoursePayment | null> {
	const query = new URLSearchParams({
		select: '*',
		access_token_hash: `eq.${tokenHash}`,
		access_token_expires_at: `gt.${new Date().toISOString()}`,
		payment_status: 'eq.success',
		course_access_granted: 'eq.true',
		amount: `eq.${getCoursePricePaise()}`,
		course_name: `eq.${COURSE_NAME}`,
	});
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`, {
		method: 'PATCH',
		headers: {Prefer: 'return=representation'},
		body: JSON.stringify({
			access_token_hash: null,
			access_token_expires_at: null,
			access_token_used_at: new Date().toISOString(),
			access_session_hash: sessionHash,
			access_session_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
		}),
	}, timing, 'supabase_raw_token_exchange');
	return rows[0] ?? null;
}

export async function sendCourseAccessEmail(payment: CoursePayment): Promise<void> {
	if (!payment.customer_email) throw new Error('Payment record has no customer email');
	const token = createAccessToken();
	const tokenHash = hashAccessToken(token);
	const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
	const query = new URLSearchParams({
		id: `eq.${payment.id}`,
		payment_status: 'eq.success',
		course_access_granted: 'eq.true',
	});
	await supabaseRequest(`course_payments?${query}`, {
		method: 'PATCH',
		headers: {Prefer: 'return=minimal'},
		body: JSON.stringify({
			access_token_hash: tokenHash,
			access_token_expires_at: expiresAt,
			access_token_used_at: null,
			access_session_hash: null,
			access_session_expires_at: null,
		}),
	});

	const appUrl = requiredEnv('APP_BASE_URL').replace(/\/$/, '');
	const accessUrl = `${appUrl}/api/course-access/verify?token=${encodeURIComponent(token)}`;
	const emailResponse = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${requiredEnv('RESEND_API_KEY')}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			from: requiredEnv('COURSE_ACCESS_FROM_EMAIL'),
			to: [payment.customer_email],
			subject: 'Your Share Market Complete Course access',
			text: `Your payment is verified. Open this secure link within 30 minutes to access your course: ${accessUrl}`,
			html: `<p>Your payment is verified.</p><p><a href="${accessUrl}">Access your Share Market Complete Course</a></p><p>This secure link expires in 30 minutes and can only be used once.</p>`,
		}),
	});
	if (!emailResponse.ok) throw new Error(`Course access email delivery failed (${emailResponse.status})`);
}
