alter table public.course_payments
    add column if not exists access_token_used_at timestamptz;