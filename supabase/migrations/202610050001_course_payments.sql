create table if not exists public.course_payments (
    id uuid primary key default gen_random_uuid(),
    razorpay_payment_link_id text not null unique,
    razorpay_payment_id text,
    razorpay_order_id text,
    customer_name text,
    customer_email text,
    amount integer not null,
    payment_status text not null check (payment_status in ('pending', 'success', 'failed')),
    course_name text not null,
    course_access_granted boolean not null default false,
    access_token_hash text,
    access_token_expires_at timestamptz,
    access_session_hash text,
    access_session_expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint course_payments_status_access_check
        check (not course_access_granted or payment_status = 'success')
);

create index if not exists course_payments_access_token_idx
    on public.course_payments (access_token_hash)
    where access_token_hash is not null;

create index if not exists course_payments_access_session_idx
    on public.course_payments (access_session_hash)
    where access_session_hash is not null;

alter table public.course_payments enable row level security;

create or replace function public.record_course_payment(
    p_payment_link_id text,
    p_payment_id text,
    p_order_id text,
    p_customer_name text,
    p_customer_email text,
    p_amount integer,
    p_payment_status text,
    p_course_name text
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
        payment_status,
        course_name,
        course_access_granted
    ) values (
        p_payment_link_id,
        p_payment_id,
        p_order_id,
        p_customer_name,
        lower(p_customer_email),
        p_amount,
        p_payment_status,
        p_course_name,
        p_payment_status = 'success'
    )
    on conflict (razorpay_payment_link_id) do update set
        razorpay_payment_id = coalesce(excluded.razorpay_payment_id, course_payments.razorpay_payment_id),
        razorpay_order_id = coalesce(excluded.razorpay_order_id, course_payments.razorpay_order_id),
        customer_name = coalesce(excluded.customer_name, course_payments.customer_name),
        customer_email = coalesce(excluded.customer_email, course_payments.customer_email),
        amount = excluded.amount,
        payment_status = case
            when course_payments.payment_status = 'success' then 'success'
            else excluded.payment_status
        end,
        course_access_granted = course_payments.course_access_granted or excluded.course_access_granted,
        updated_at = now();
$$;

revoke all on function public.record_course_payment(text, text, text, text, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.record_course_payment(text, text, text, text, text, integer, text, text) to service_role;
revoke all on table public.course_payments from public, anon, authenticated;
grant select, insert, update on table public.course_payments to service_role;