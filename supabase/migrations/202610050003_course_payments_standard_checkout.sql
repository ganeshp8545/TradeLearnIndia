alter table public.course_payments
    add column if not exists currency text,
    add column if not exists course_slug text,
    add column if not exists razorpay_payment_link_id text;

-- The original unique constraint owns the underlying index. Drop the CONSTRAINT, not the index.
alter table public.course_payments
    drop constraint if exists course_payments_razorpay_payment_link_id_key;

-- Standard Checkout stores the order ID and payment ID as the authoritative keys.
create unique index if not exists course_payments_razorpay_order_id_key
    on public.course_payments (razorpay_order_id)
    where razorpay_order_id is not null;

create unique index if not exists course_payments_razorpay_payment_id_key
    on public.course_payments (razorpay_payment_id)
    where razorpay_payment_id is not null;

update public.course_payments
set course_slug = 'share-market-complete-course'
where course_slug is null and course_name = 'Share Market Complete Course';

update public.course_payments
set currency = 'INR'
where currency is null and amount = 1.9900;

alter table public.course_payments
    alter column razorpay_payment_link_id drop not null;

create or replace function public.record_course_payment(
    p_payment_link_id text,
    p_payment_id text,
    p_order_id text,
    p_customer_name text,
    p_customer_email text,
    p_amount integer,
    p_payment_status text,
    p_course_name text,
    p_currency text default 'INR',
    p_course_slug text default 'share-market-complete-course'
) returns void
language sql
security definer
set search_path = ''
as $$
    insert into public.course_payments (
        razorpay_payment_link_id,
        razorpay_payment_id,
        razorpay_order_id,
        customer_name,
        customer_email,
        amount,
        currency,
        payment_status,
        course_name,
        course_slug,
        course_access_granted
    ) values (
        p_payment_link_id,
        p_payment_id,
        p_order_id,
        p_customer_name,
        lower(p_customer_email),
        p_amount,
        p_currency,
        p_payment_status,
        p_course_name,
        p_course_slug,
        p_payment_status = 'success'
    )
    on conflict (razorpay_order_id) do update set
        razorpay_payment_link_id = coalesce(excluded.razorpay_payment_link_id, course_payments.razorpay_payment_link_id),
        razorpay_payment_id = coalesce(excluded.razorpay_payment_id, course_payments.razorpay_payment_id),
        razorpay_order_id = coalesce(excluded.razorpay_order_id, course_payments.razorpay_order_id),
        customer_name = coalesce(excluded.customer_name, course_payments.customer_name),
        customer_email = coalesce(excluded.customer_email, course_payments.customer_email),
        amount = excluded.amount,
        currency = coalesce(excluded.currency, course_payments.currency),
        payment_status = case
            when course_payments.payment_status = 'success' then 'success'
            else excluded.payment_status
        end,
        course_name = coalesce(excluded.course_name, course_payments.course_name),
        course_slug = coalesce(excluded.course_slug, course_payments.course_slug),
        course_access_granted = course_payments.course_access_granted or excluded.course_access_granted,
        updated_at = now();
$$;

revoke all on function public.record_course_payment(text, text, text, text, text, integer, text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_course_payment(text, text, text, text, text, integer, text, text, text, text) to service_role;
