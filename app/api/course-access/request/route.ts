import {NextResponse} from 'next/server';
import {getPaymentByLinkId, sendCourseAccessEmail} from '@/lib/course-access';

export const runtime = 'nodejs';

export async function POST(request: Request) {
	try {
		const body = await request.json() as {payment_link_id?: string; email?: string};
		const linkId = body.payment_link_id?.trim() ?? '';
		const email = body.email?.trim().toLowerCase() ?? '';
		if (!/^plink_[A-Za-z0-9]+$/.test(linkId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return NextResponse.json({error: 'Enter a valid payment reference and email address.'}, {status: 400});
		}
		const payment = await getPaymentByLinkId(linkId);
		if (!payment) return NextResponse.json({error: 'Payment not found.'}, {status: 404});
		if (payment.payment_status === 'pending') return NextResponse.json({error: 'Payment verification is pending.'}, {status: 409});
		if (payment.payment_status === 'failed') return NextResponse.json({error: 'Payment failed. No course access was granted.'}, {status: 402});
		if (!payment.course_access_granted || payment.customer_email?.toLowerCase() !== email) {
			return NextResponse.json({error: 'Invalid access details. Use the email address used for payment.'}, {status: 403});
		}
		await sendCourseAccessEmail(payment);
		return NextResponse.json({sent: true});
	} catch (error) {
		console.error('Course access email request failed', error);
		return NextResponse.json({error: 'Server error. Please try again later.'}, {status: 500});
	}
}