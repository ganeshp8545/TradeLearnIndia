import 'server-only';
import {createHash, randomBytes} from 'node:crypto';

export const COURSE_NAME = 'Share Market Complete Course';
export const COURSE_SLUG = 'share-market-complete-course';
export const COURSE_PRICE_INR = 499;
export const TEST_COURSE_PRICE_INR = 1;

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

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
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
	if (response.status === 204) return undefined as T;
	return response.json() as Promise<T>;
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
}): Promise<void> {
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
	const query = new URLSearchParams({on_conflict: 'razorpay_order_id'});
	await supabaseRequest(`course_payments?${query}`, {
		method: 'POST',
		headers: {Prefer: 'resolution=merge-duplicates'},
		body: JSON.stringify(payload),
	});
}

export async function getPaymentByOrderId(orderId: string): Promise<CoursePayment | null> {
	const query = new URLSearchParams({
		select: '*',
		razorpay_order_id: `eq.${orderId}`,
		limit: '1',
	});
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`);
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
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`);
	return rows[0] ?? null;
}

export async function grantCourseAccessToken(orderId: string, paymentId: string): Promise<string | null> {
	const token = createAccessToken();
	const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
	const now = new Date().toISOString();
	const query = new URLSearchParams({
		select: 'id',
		razorpay_order_id: `eq.${orderId}`,
		razorpay_payment_id: `eq.${paymentId}`,
		payment_status: 'eq.success',
		course_access_granted: 'eq.true',
		amount: `eq.${getCoursePricePaise()}`,
		course_name: `eq.${COURSE_NAME}`,
		access_token_used_at: 'is.null',
		or: `(access_token_hash.is.null,access_token_expires_at.lt.${now})`,
		and: `(or(access_session_hash.is.null,access_session_expires_at.lt.${now}))`,
	});
	const rows = await supabaseRequest<Array<{id: string}>>(`course_payments?${query}`, {
		method: 'PATCH',
		headers: {Prefer: 'return=representation'},
		body: JSON.stringify({
			access_token_hash: hashAccessToken(token),
			access_token_expires_at: expiresAt,
			access_session_hash: null,
			access_session_expires_at: null,
		}),
	});
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
	});
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
