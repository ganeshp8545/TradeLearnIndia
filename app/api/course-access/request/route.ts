import {after, NextResponse} from 'next/server';
import {getPaymentByOrderId, isAllowedCourseOrigin, sendCourseAccessEmail, takeCourseRateLimit} from '@/lib/course-access';
import {limitCourseRequest} from '@/lib/course-request-security';

export const runtime = 'nodejs';
export const maxDuration = 120;
const message = 'If these details match an eligible purchase, a recovery link will be sent to the registered email. Check spam, or contact support if it does not arrive.';

export async function POST(request: Request) {
    if (!isAllowedCourseOrigin(request)) return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
    try {
        const body = await request.json();
        const orderId = typeof body?.order_id === 'string' ? body.order_id.trim() : '';
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (!/^order_[A-Za-z0-9]{1,100}$/.test(orderId) || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({error: 'Enter your order reference and a valid email address.'}, {status: 400});
        }
        if (!await limitCourseRequest(request, 'recovery', 10, 3600)) {
            return NextResponse.json({error: 'Too many requests. Please try again in an hour.'}, {status: 429, headers: {'Retry-After': '3600'}});
        }
        // Response timing and content never depend on purchase existence, payment
        // state, account throttling or email delivery. Next keeps this task alive.
        after(async () => {
            try {
                if (!await takeCourseRateLimit('recovery:mailbox', email, 3, 3600)) return;
                const payment = await getPaymentByOrderId(orderId);
                if (payment && payment.customer_email?.trim().toLowerCase() === email) await sendCourseAccessEmail(payment);
            } catch { console.error('Course recovery delivery unavailable'); }
        });
        return NextResponse.json({message}, {status: 202, headers: {'Cache-Control': 'no-store'}});
    } catch {
        return NextResponse.json({error: 'Recovery temporarily unavailable. Please try again later.'}, {status: 503});
    }
}
