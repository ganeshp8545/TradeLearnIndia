alter table public.course_payments
    add column if not exists whatsapp_phone text,
    add column if not exists whatsapp_consent boolean not null default false,
    add column if not exists whatsapp_consent_at timestamptz,
    add column if not exists whatsapp_message_status text not null default 'not_eligible',
    add column if not exists whatsapp_message_id text,
    add column if not exists whatsapp_message_sent_at timestamptz,
    add column if not exists whatsapp_message_error text;

alter table public.course_payments
    drop constraint if exists course_payments_whatsapp_phone_check,
    add constraint course_payments_whatsapp_phone_check
        check (whatsapp_phone is null or whatsapp_phone ~ '^\\+91[6-9][0-9]{9}$'),
    drop constraint if exists course_payments_whatsapp_status_check,
    add constraint course_payments_whatsapp_status_check
        check (whatsapp_message_status in ('pending', 'sending', 'sent', 'failed', 'not_eligible')),
    drop constraint if exists course_payments_whatsapp_consent_check,
    add constraint course_payments_whatsapp_consent_check
        check (not whatsapp_consent or (whatsapp_phone is not null and whatsapp_consent_at is not null));

drop function if exists public.record_course_payment(text, text, text, text, text, integer, text, text);
drop function if exists public.record_course_payment(text, text, text, text, text, integer, text, text, text, text);

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
    p_course_slug text default 'share-market-complete-course',
    p_whatsapp_phone text default null,
    p_whatsapp_consent boolean default null,
    p_whatsapp_consent_at timestamptz default null
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
        course_access_granted,
        whatsapp_phone,
        whatsapp_consent,
        whatsapp_consent_at,
        whatsapp_message_status
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
        p_payment_status = 'success',
        p_whatsapp_phone,
        coalesce(p_whatsapp_consent, false),
        p_whatsapp_consent_at,
        case when coalesce(p_whatsapp_consent, false) and p_whatsapp_phone is not null then 'pending' else 'not_eligible' end
    )
    on conflict (razorpay_order_id) do update set
        razorpay_payment_link_id = coalesce(excluded.razorpay_payment_link_id, course_payments.razorpay_payment_link_id),
        razorpay_payment_id = case
            when course_payments.payment_status = 'success' then course_payments.razorpay_payment_id
            else coalesce(excluded.razorpay_payment_id, course_payments.razorpay_payment_id)
        end,
        razorpay_order_id = coalesce(excluded.razorpay_order_id, course_payments.razorpay_order_id),
        customer_name = coalesce(excluded.customer_name, course_payments.customer_name),
        customer_email = coalesce(excluded.customer_email, course_payments.customer_email),
        amount = excluded.amount,
        currency = coalesce(excluded.currency, course_payments.currency),
        payment_status = case when course_payments.payment_status = 'success' then 'success' else excluded.payment_status end,
        course_name = coalesce(excluded.course_name, course_payments.course_name),
        course_slug = coalesce(excluded.course_slug, course_payments.course_slug),
        course_access_granted = course_payments.course_access_granted or excluded.course_access_granted,
        whatsapp_phone = coalesce(excluded.whatsapp_phone, course_payments.whatsapp_phone),
        whatsapp_consent = course_payments.whatsapp_consent or excluded.whatsapp_consent,
        whatsapp_consent_at = coalesce(excluded.whatsapp_consent_at, course_payments.whatsapp_consent_at),
        whatsapp_message_status = case
            when course_payments.whatsapp_message_status in ('sent', 'sending', 'failed') then course_payments.whatsapp_message_status
            when course_payments.whatsapp_consent or excluded.whatsapp_consent then 'pending'
            else 'not_eligible'
        end,
        updated_at = now();
$$;

revoke all on function public.record_course_payment(text, text, text, text, text, integer, text, text, text, text, text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.record_course_payment(text, text, text, text, text, integer, text, text, text, text, text, boolean, timestamptz) to service_role;
