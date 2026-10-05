import {NextResponse} from 'next/server';
import {getPaymentByOrderId} from '@/lib/course-access';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	const orderId = new URL(request.url).searchParams.get('order_id');
	if (!orderId) {
		return NextResponse.json({status: 'not_found'}, {status: 400});
	}
	try {
		const payment = await getPaymentByOrderId(orderId);
		return NextResponse.json({status: payment?.payment_status ?? 'not_found'});
	} catch (error) {
		console.error('Payment status lookup failed', error);
		return NextResponse.json({status: 'server_error'}, {status: 500});
	}
}