import {createHmac, timingSafeEqual} from 'node:crypto';

export function verifyRazorpayWebhookSignature(
	rawBody: string,
	signature: string | null,
	webhookSecret: string,
): boolean {
	if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
	const expected = createHmac('sha256', webhookSecret).update(rawBody).digest();
	const received = Buffer.from(signature, 'hex');
	return received.length === expected.length && timingSafeEqual(received, expected);
}

export function verifyRazorpayOrderSignature(
	orderId: string,
	paymentId: string,
	signature: string | null,
	keySecret: string,
): boolean {
	if (!orderId || !paymentId || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
	const payload = `${orderId}|${paymentId}`;
	const expected = createHmac('sha256', keySecret).update(payload).digest();
	const received = Buffer.from(signature, 'hex');
	return received.length === expected.length && timingSafeEqual(received, expected);
}

export function verifyRazorpayCallbackSignature(
	fields: {paymentLinkId: string; referenceId: string; status: string; paymentId: string},
	signature: string | null,
	keySecret: string,
): boolean {
	if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
	const payload = [fields.paymentLinkId, fields.referenceId, fields.status, fields.paymentId].join('|');
	const expected = createHmac('sha256', keySecret).update(payload).digest();
	const received = Buffer.from(signature, 'hex');
	return received.length === expected.length && timingSafeEqual(received, expected);
}