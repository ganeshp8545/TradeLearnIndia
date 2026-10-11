-- Apply only after an approved backup and isolated migration rehearsal.
-- No historical success row is automatically considered captured.
begin;
alter table public.course_payments add column capture_verified_at timestamptz;
alter table public.course_payments add constraint course_capture_evidence_check check (
    capture_verified_at is null or
    (payment_status = 'success' and course_access_granted and razorpay_payment_id is not null
     and razorpay_order_id is not null and amount > 0 and currency is not null and currency = 'INR'
     and course_slug is not null and course_slug = 'share-market-complete-course')
);

-- The old RPC can grant on a status string. Retain its implementation privately
-- for schema compatibility, but remove the application's ability to invoke it.
revoke all on function public.record_course_payment(text,text,text,text,text,integer,text,text,text,text,text,boolean,timestamptz) from public, anon, authenticated, service_role;
revoke insert, update on public.course_payments from service_role;

create function public.record_course_payment_v2(
    p_order_id text, p_payment_id text, p_customer_name text, p_customer_email text,
    p_amount integer, p_currency text, p_payment_status text, p_capture_verified boolean
) returns setof public.course_payments
language plpgsql security definer set search_path = '' as $$
declare v public.course_payments;
begin
    if p_order_id is null or p_order_id !~ '^order_[A-Za-z0-9]+$'
       or p_amount is null or p_amount <= 0 or p_currency is distinct from 'INR'
       or p_payment_status not in ('pending','failed','success')
       or p_capture_verified is null or ((p_payment_status = 'success') <> p_capture_verified)
       or (p_capture_verified and (p_payment_id is null or p_payment_id !~ '^pay_[A-Za-z0-9]+$')) then
        raise exception 'Invalid payment evidence';
    end if;
    -- Unique order/payment indexes from 004 serialize retries and callback races.
    insert into public.course_payments (razorpay_order_id, amount, currency, course_name, course_slug, payment_status)
    values (p_order_id, p_amount, 'INR', 'Share Market Educational Course', 'share-market-complete-course', 'pending')
    on conflict (razorpay_order_id) do nothing;
    select * into v from public.course_payments where razorpay_order_id = p_order_id for update;
    if v.amount <> p_amount or (v.currency is not null and v.currency <> 'INR')
       or (v.course_slug is not null and v.course_slug <> 'share-market-complete-course')
       or v.course_name not in ('Share Market Educational Course','Share Market Complete Course') then
        raise exception 'Stored purchase mismatch';
    end if;
    if v.capture_verified_at is not null then
        if p_capture_verified and v.razorpay_payment_id is distinct from p_payment_id then
            raise exception 'Captured payment identity is immutable';
        end if;
        return next v; return; -- no email replacement, downgrade or duplicate grant
    end if;
    if p_capture_verified then
        update public.course_payments set razorpay_payment_id = p_payment_id,
            customer_name = coalesce(customer_name, p_customer_name),
            -- Keep the purchase mailbox; recovery never accepts a new destination.
            customer_email = coalesce(nullif(customer_email, ''), lower(nullif(p_customer_email, ''))),
            currency = 'INR', course_slug = 'share-market-complete-course',
            payment_status = 'success', course_access_granted = true,
            capture_verified_at = now(), updated_at = now()
        where id = v.id returning * into v;
    elsif v.payment_status <> 'success' then
        update public.course_payments set
            razorpay_payment_id = coalesce(p_payment_id, razorpay_payment_id),
            payment_status = case when payment_status = 'failed' and p_payment_status = 'pending' then 'failed' else p_payment_status end,
            updated_at = now()
        where id = v.id returning * into v;
    end if;
    return next v;
end $$;

create table public.course_access_credentials (
    token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
    payment_id uuid not null references public.course_payments(id),
    kind text not null check (kind in ('session','recovery')),
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);
create index course_credentials_expiry_idx on public.course_access_credentials(expires_at);
alter table public.course_access_credentials enable row level security;
revoke all on public.course_access_credentials from public, anon, authenticated, service_role;

create function public.issue_course_credential(p_payment_id uuid, p_hash text, p_kind text, p_checkout boolean default false)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
    if p_kind not in ('session','recovery') or not exists (
        select 1 from public.course_payments where id = p_payment_id
        and capture_verified_at is not null and payment_status = 'success' and course_access_granted
    ) then return false; end if;
    insert into public.course_access_credentials(token_hash,payment_id,kind,expires_at)
    values(p_hash,p_payment_id,p_kind,case
        when p_checkout and p_kind='session' then (select capture_verified_at + interval '24 hours' from public.course_payments where id=p_payment_id)
        when p_kind='recovery' then now()+interval '30 minutes'
        else now()+interval '24 hours' end)
    on conflict (token_hash) do nothing; -- a retry does not extend the credential
    return exists(select 1 from public.course_access_credentials where token_hash=p_hash
        and payment_id=p_payment_id and kind=p_kind and consumed_at is null and expires_at>now());
end $$;

create function public.lookup_course_credential(p_hash text, p_kind text)
returns setof public.course_payments language sql security definer set search_path = '' as $$
    select p.* from public.course_payments p join public.course_access_credentials c on c.payment_id=p.id
    where c.token_hash=p_hash and c.kind=p_kind and c.consumed_at is null and c.expires_at>now()
    and p.capture_verified_at is not null and p.payment_status='success' and p.course_access_granted;
$$;

create function public.exchange_course_credential(p_hash text, p_session_hash text)
returns setof public.course_payments language plpgsql security definer set search_path = '' as $$
declare v public.course_payments; c public.course_access_credentials;
begin
    select * into c from public.course_access_credentials where token_hash=p_hash and kind='recovery' for update;
    if found then
        if c.consumed_at is not null or c.expires_at<=now() then return; end if;
        select * into v from public.course_payments where id=c.payment_id for update;
    else
        -- Existing unexpired raw links remain compatible after server capture reconciliation.
        select * into v from public.course_payments where access_token_hash=p_hash
            and access_token_expires_at>now() for update;
    end if;
    if v.id is null or v.capture_verified_at is null or v.payment_status<>'success' or not v.course_access_granted then return; end if;
    if not public.issue_course_credential(v.id,p_session_hash,'session') then return; end if;
    if c.token_hash is not null then
        update public.course_access_credentials set consumed_at=now() where token_hash=p_hash;
    else
        update public.course_payments set access_token_hash=null,access_token_expires_at=null,access_token_used_at=now() where id=v.id;
    end if;
    return next v;
end $$;

-- Shared across serverless instances. Keys are HMACs; no email or IP is stored.
create table public.course_request_limits (
    bucket_key text primary key check (bucket_key ~ '^[a-f0-9]{64}$'),
    window_started timestamptz not null,
    attempts integer not null
);
alter table public.course_request_limits enable row level security;
revoke all on public.course_request_limits from public, anon, authenticated, service_role;
create function public.take_course_rate_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
    if p_limit<1 or p_seconds<1 then return false; end if;
    insert into public.course_request_limits values(p_key,now(),1)
    on conflict(bucket_key) do update set
        attempts=case when course_request_limits.window_started<=now()-make_interval(secs=>p_seconds) then 1 else course_request_limits.attempts+1 end,
        window_started=case when course_request_limits.window_started<=now()-make_interval(secs=>p_seconds) then now() else course_request_limits.window_started end
    returning attempts into n;
    return n<=p_limit;
end $$;

revoke all on function public.record_course_payment_v2(text,text,text,text,integer,text,text,boolean),
    public.issue_course_credential(uuid,text,text,boolean), public.lookup_course_credential(text,text),
    public.exchange_course_credential(text,text), public.take_course_rate_limit(text,integer,integer)
    from public, anon, authenticated;
grant execute on function public.record_course_payment_v2(text,text,text,text,integer,text,text,boolean),
    public.issue_course_credential(uuid,text,text,boolean), public.lookup_course_credential(text,text),
    public.exchange_course_credential(text,text), public.take_course_rate_limit(text,integer,integer)
    to service_role;
commit;
