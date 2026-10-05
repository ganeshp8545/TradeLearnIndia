import {PaymentReturn} from '@/components/PaymentReturn';

export const metadata = {title: 'Payment status | CampusEduX', robots: {index: false, follow: false}};

export default function PaymentReturnPage({searchParams}: {searchParams: {razorpay_payment_link_id?: string}}) {
	return <PaymentReturn paymentLinkId={searchParams.razorpay_payment_link_id ?? ''}/>;
}