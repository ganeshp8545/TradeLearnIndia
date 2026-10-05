import {PaymentReturn} from '@/components/PaymentReturn';

export const metadata = {title: 'Payment status | CampusEduX', robots: {index: false, follow: false}};

type CallbackParams = {
	razorpay_payment_id?: string | string[];
	razorpay_order_id?: string | string[];
	razorpay_signature?: string | string[];
};

function first(value: string | string[] | undefined): string {
	return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function PaymentReturnPage({searchParams}: {searchParams: CallbackParams}) {
	return <PaymentReturn callback={{
		razorpay_payment_id: first(searchParams.razorpay_payment_id),
		razorpay_order_id: first(searchParams.razorpay_order_id),
		razorpay_signature: first(searchParams.razorpay_signature),
	}}/>;
}