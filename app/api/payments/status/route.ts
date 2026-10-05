import {NextResponse} from 'next/server';
import {getPaymentByLinkId} from '@/lib/course-access';

export const runtime = 'nodejs';

export async function GET(request: Request) {
	const linkId = new URL(request.url).searchParams.get('payment_link_id');
	if (!linkId || !/^plink_[A-Za-z0-9]+$/.test(linkId)) {
		return NextResponse.json({status: 'not_found'}, {status: 400});
	}
	try {
		const payment = await getPaymentByLinkId(linkId);
		return NextResponse.json({status: payment?.payment_status ?? 'not_found'});
	} catch (error) {
		console.error('Payment status lookup failed', error);
		return NextResponse.json({status: 'server_error'}, {status: 500});
	}
}