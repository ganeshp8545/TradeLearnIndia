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