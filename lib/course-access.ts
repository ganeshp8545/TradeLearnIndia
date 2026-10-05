import {createHash, randomBytes} from 'node:crypto';

export const COURSE_NAME = 'Share Market Complete Course';
export const COURSE_PRICE_PAISE = 49900;

export type PaymentStatus = 'pending' | 'success' | 'failed';

export type CoursePayment = {
	id: string;
	razorpay_payment_link_id: string;
	razorpay_payment_id: string | null;
	razorpay_order_id: string | null;
	customer_name: string | null;
	customer_email: string | null;
	amount: number;
	payment_status: PaymentStatus;
	course_name: string;
	course_access_granted: boolean;
	created_at: string;
	access_token_hash?: string | null;
	access_token_expires_at?: string | null;
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
	linkId: string;
	paymentId: string | null;
	orderId: string | null;
	name: string | null;
	email: string | null;
	amount: number;
	status: PaymentStatus;
}): Promise<void> {
	await supabaseRequest('rpc/record_course_payment', {
		method: 'POST',
		body: JSON.stringify({
			p_payment_link_id: payment.linkId,
			p_payment_id: payment.paymentId,
			p_order_id: payment.orderId,
			p_customer_name: payment.name,
			p_customer_email: payment.email?.toLowerCase() ?? null,
			p_amount: payment.amount,
			p_payment_status: payment.status,
			p_course_name: COURSE_NAME,
		}),
	});
}

export async function getPaymentByLinkId(linkId: string): Promise<CoursePayment | null> {
	const query = new URLSearchParams({
		select: '*',
		razorpay_payment_link_id: `eq.${linkId}`,
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
		limit: '1',
	});
	const rows = await supabaseRequest<CoursePayment[]>(`course_payments?${query}`);
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
		body: JSON.stringify({access_token_hash: tokenHash, access_token_expires_at: expiresAt}),
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

export async function saveAccessSession(payment: CoursePayment, sessionHash: string): Promise<void> {
	const query = new URLSearchParams({id: `eq.${payment.id}`});
	await supabaseRequest(`course_payments?${query}`, {
		method: 'PATCH',
		headers: {Prefer: 'return=minimal'},
		body: JSON.stringify({
			access_token_hash: null,
			access_token_expires_at: null,
			access_session_hash: sessionHash,
			access_session_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		}),
	});
}