import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {URL, URLSearchParams} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const fixedNow = Date.now();
const secret = 'test-only-key-secret';
const signature = createHmac('sha256', secret).update('order_test|pay_test').digest('hex');
const input = {orderId: 'order_test', paymentId: 'pay_test', signature};
const base = {id: '11111111-1111-1111-1111-111111111111', razorpay_order_id: 'order_test', razorpay_payment_id: null,
  amount: 49900, currency: 'INR', course_name: 'Share Market Educational Course', course_slug: 'share-market-complete-course',
  customer_email: 'buyer@example.test', payment_status: 'pending', course_access_granted: false};

function fixture(options = {}) {
  const state = {row: {...base, ...options.stored}, writes: 0, grants: 0, issued: new Map(), calls: [], sent: [], after: [], rateAllowed: true};
  const env = {SUPABASE_URL: 'https://db.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fake-service', RAZORPAY_KEY_ID: 'rzp_test_fake',
    RAZORPAY_KEY_SECRET: secret, RAZORPAY_WEBHOOK_SECRET: 'test-webhook-secret', COURSE_TEST_MODE: 'true',
    COURSE_ACCESS_SECRET: 'test-only-access-secret-with-sufficient-length', APP_BASE_URL: 'https://site.invalid',
    RESEND_API_KEY: 'fake-email', COURSE_ACCESS_FROM_EMAIL: 'test@example.test', NODE_ENV: 'test'};
  const fetch = async (url, init = {}) => {
    state.calls.push(String(url));
    const data = init.body ? JSON.parse(init.body) : {};
    const json = value => ({ok: true, status: 200, json: async () => value});
    if (url === 'https://api.razorpay.com/v1/orders/order_test') return json({id: 'order_test', amount: options.orderAmount ?? 49900, currency: 'INR', receipt: 'course_test', notes: {course: 'share-market-complete-course'}, ...options.order});
    if (url === 'https://api.razorpay.com/v1/payments/pay_test') return json({id: 'pay_test', order_id: 'order_test', amount: 49900, currency: 'INR', status: 'captured', email: 'buyer@example.test', ...options.payment});
    if (url === 'https://api.resend.com/emails') { state.sent.push(data); return {ok: !options.emailFailure, status: options.emailFailure ? 503 : 200}; }
    if (!String(url).startsWith('https://db.invalid/rest/v1/')) throw new Error(`Unexpected network call: ${url}`);
    if (String(url).includes('/rpc/record_course_payment_v2')) {
      state.writes++;
      if (data.p_capture_verified && !state.row.capture_verified_at) {
        state.grants++; Object.assign(state.row, {payment_status: 'success', course_access_granted: true, capture_verified_at: new Date().toISOString(), razorpay_payment_id: data.p_payment_id});
      }
      return json([state.row]);
    }
    if (String(url).includes('/rpc/issue_course_credential')) {
      if (!state.row.capture_verified_at) return json(false);
      if (!state.issued.has(data.p_hash)) state.issued.set(data.p_hash, {kind: data.p_kind, expires: fixedNow + 1800000, used: false});
      return json(!state.issued.get(data.p_hash).used);
    }
    if (String(url).includes('/rpc/lookup_course_credential')) {
      const c = state.issued.get(data.p_hash);
      return json(c && c.kind === data.p_kind && !c.used && c.expires > Date.now() ? [state.row] : []);
    }
    if (String(url).includes('/rpc/exchange_course_credential')) {
      const c = state.issued.get(data.p_hash);
      if (!c || c.used || c.expires <= Date.now() || !state.row.capture_verified_at) return json([]);
      c.used = true; state.issued.set(data.p_session_hash, {kind: 'session', expires: fixedNow + 86400000, used: false});
      return json([state.row]);
    }
    if (String(url).includes('/rpc/take_course_rate_limit')) return json(state.rateAllowed);
    if (String(url).includes('/course_payments?')) {
      const query = new URL(url).searchParams;
      if (query.has('access_token_hash')) return json([]);
      if (query.has('access_session_hash')) return json(options.legacySession ? [state.row] : []);
      return json(options.missing ? [] : [state.row]);
    }
    throw new Error(`Unmocked request: ${url}`);
  };
  const modules = new Map();
  function load(path) {
    if (modules.has(path)) return modules.get(path).exports;
    const mod = {exports: {}}; modules.set(path, mod);
    const source = readFileSync(new URL(`../${path}.ts`, import.meta.url), 'utf8');
    const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
    vm.runInNewContext(output, {module: mod, exports: mod.exports, require: name => {
      if (name === 'server-only') return {};
      if (name === 'next/server') return {...require('next/server'), after: task => state.after.push(task)};
      return name.startsWith('@/') ? load(name.slice(2)) : require(name);
    }, fetch, process: {env}, Buffer, URL, URLSearchParams, AbortSignal: globalThis.AbortSignal,
    console: {error() {}, info() {}, warn() {}}, Date}, {filename: path});
    return mod.exports;
  }
  return {state, env, load, api: load('lib/course-access')};
}

for (const status of ['authorized', 'created', 'failed', 'unknown', undefined]) {
  test(`${status ?? 'absent'} payment status never grants access`, async () => {
    const {api, state} = fixture({payment: {status}});
    const result = await api.verifyAndGrantCourseAccess(input);
    assert.notEqual(result.status, 'success'); assert.equal(state.grants, 0); assert.equal(state.issued.size, 0);
  });
}
test('captured payment grants one entitlement and idempotent callback session', async () => {
  const {api, state} = fixture();
  const results = await Promise.all([api.verifyAndGrantCourseAccess(input), api.verifyAndGrantCourseAccess(input)]);
  assert.equal(results[0].status, 'success'); assert.equal(results[0].sessionToken, results[1].sessionToken);
  assert.equal(state.grants, 1); assert.equal(state.issued.size, 1);
});
for (const [name, payment] of [['amount', {amount: 100}], ['currency', {currency: 'USD'}], ['order identity', {order_id: 'order_wrong'}], ['payment identity', {id: 'pay_wrong'}]]) {
  test(`incorrect ${name} prevents access`, async () => {
    const {api, state} = fixture({payment}); await api.verifyAndGrantCourseAccess(input);
    assert.equal(state.grants, 0); assert.equal(state.issued.size, 0);
  });
}
test('invalid callback signature fails before database/provider requests', async () => {
  const {api, state} = fixture(); assert.equal((await api.verifyAndGrantCourseAccess({...input, signature: '0'.repeat(64)})).status, 'failed');
  assert.equal(state.calls.length, 0);
});
test('signed duplicate webhooks and late failures never issue duplicate access', async () => {
  const {load, state} = fixture(); const {POST} = load('app/api/razorpay/webhook/route');
  for (const event of ['payment.captured', 'payment.captured', 'payment.failed']) {
    const body = JSON.stringify({event, payload: {payment: {entity: {id: 'pay_test', order_id: 'order_test'}}}});
    const sig = createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
    const result = await POST(new globalThis.Request('https://site.invalid/api/razorpay/webhook', {method: 'POST', body, headers: {'x-razorpay-signature': sig}}));
    assert.equal(result.status, 200);
  }
  assert.equal(state.grants, 1); assert.equal(state.issued.size, 0);
});
test('forged webhook is rejected without provider or database requests', async () => {
  const {load, state} = fixture(); const response = await load('app/api/razorpay/webhook/route').POST(new globalThis.Request('https://site.invalid', {method: 'POST', body: '{}'}));
  assert.equal(response.status, 401); assert.equal(state.calls.length, 0);
});
test('captured webhook with authorized API state requests retry and grants nothing', async () => {
  const {load, state} = fixture({payment: {status: 'authorized'}});
  const body = JSON.stringify({event: 'payment.captured', payload: {payment: {entity: {id: 'pay_test', order_id: 'order_test'}}}});
  const sig = createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
  const response = await load('app/api/razorpay/webhook/route').POST(new globalThis.Request('https://site.invalid', {method: 'POST', body, headers: {'x-razorpay-signature': sig}}));
  assert.equal(response.status, 503); assert.equal(state.grants, 0);
});
for (const kind of ['invalid', 'expired', 'used']) {
  test(`${kind} recovery token rejected`, async () => {
    const {api, state} = fixture({stored: {payment_status: 'success', course_access_granted: true, capture_verified_at: new Date().toISOString()}});
    const hash = api.hashAccessToken('test-recovery');
    if (kind !== 'invalid') state.issued.set(hash, {kind: 'recovery', expires: kind === 'expired' ? fixedNow - 1 : fixedNow + 1800000, used: kind === 'used'});
    assert.equal(await api.exchangeAccessTokenForSession(hash, api.hashAccessToken('session')), null);
  });
}
test('recovery is single-use and preserves existing sessions', async () => {
  const {api, state} = fixture(); const paid = await api.verifyAndGrantCourseAccess(input);
  const oldHash = api.hashAccessToken(paid.sessionToken);
  const hash = api.hashAccessToken('recovery'); state.issued.set(hash, {kind: 'recovery', expires: fixedNow + 1800000, used: false});
  assert.ok(await api.exchangeAccessTokenForSession(hash, api.hashAccessToken('new-session')));
  assert.equal(await api.exchangeAccessTokenForSession(hash, api.hashAccessToken('replayed-session')), null);
  assert.ok(state.issued.has(oldHash)); assert.equal(state.issued.get(oldHash).used, false);
});
test('email delivery failure leaves the active session unchanged', async () => {
  const {api, state} = fixture({emailFailure: true}); await api.verifyAndGrantCourseAccess(input);
  const sessions = [...state.issued.entries()].filter(([, c]) => c.kind === 'session');
  await assert.rejects(api.sendCourseAccessEmail(state.row), /delivery unavailable/);
  assert.deepEqual([...state.issued.entries()].filter(([, c]) => c.kind === 'session'), sessions);
  assert.equal(state.sent[0].to[0], base.customer_email);
  assert.match(state.sent[0].text, /recover#token=/);
});
test('historical captured purchase retains old title, null metadata and original price', async () => {
  const {api, state} = fixture({legacySession: true, stored: {payment_status: 'success', course_access_granted: true,
    razorpay_payment_id: 'pay_test', course_name: 'Share Market Complete Course', course_slug: null, currency: null, amount: 29900},
    order: {amount: 29900, notes: {}}, payment: {amount: 29900}});
  const result = await api.getValidCourseAccessRecord(null, 's'.repeat(43));
  assert.ok(result?.capture_verified_at); assert.equal(result.amount, 29900); assert.equal(state.grants, 1);
});
test('historical success flag with authorized payment does not preserve unverified access', async () => {
  const {api, state} = fixture({legacySession: true, stored: {payment_status: 'success', course_access_granted: true, razorpay_payment_id: 'pay_test'}, payment: {status: 'authorized'}});
  assert.equal(await api.getValidCourseAccessRecord(null, 's'.repeat(43)), null); assert.equal(state.grants, 0);
});
test('unrelated historical course cannot unlock this course', async () => {
  const {api} = fixture({legacySession: true, stored: {payment_status: 'success', course_access_granted: true, course_slug: 'other-course', razorpay_payment_id: 'pay_test'}});
  assert.equal(await api.getValidCourseAccessRecord(null, 's'.repeat(43)), null);
});
test('recovery responses do not reveal purchase existence and are sent before lookup', async () => {
  const results = [];
  for (const missing of [false, true]) {
    const {load, state} = fixture({missing});
    const response = await load('app/api/course-access/request/route').POST(new globalThis.Request('https://site.invalid/api/course-access/request', {
      method: 'POST', headers: {origin: 'https://site.invalid', 'Content-Type': 'application/json'}, body: JSON.stringify({order_id: 'order_test', email: base.customer_email})}));
    results.push([response.status, await response.text()]);
    assert.equal(state.calls.filter(c => c.includes('course_payments?')).length, 0);
    await Promise.all(state.after.map(task => task()));
  }
  assert.deepEqual(results[0], results[1]); assert.equal(results[0][0], 202);
});
test('recovery throttling rejects before lookup or email issuance', async () => {
  const {load, state} = fixture(); state.rateAllowed = false;
  const response = await load('app/api/course-access/request/route').POST(new globalThis.Request('https://site.invalid', {method: 'POST', headers: {origin: 'https://site.invalid'}, body: JSON.stringify({order_id: 'order_test', email: base.customer_email})}));
  assert.equal(response.status, 429); assert.equal(state.after.length, 0); assert.equal(state.sent.length, 0);
});
test('recovery GET never exchanges a credential', async () => {
  const {load, state} = fixture(); const {NextRequest} = require('next/server');
  const response = await load('app/api/course-access/verify/route').GET(new NextRequest(`https://site.invalid/api/course-access/verify?token=${'x'.repeat(43)}`));
  assert.equal(response.status, 303); assert.equal(state.calls.length, 0);
  assert.match(response.headers.get('location'), /recover#token=/);
});

test('callback route sets a secure HttpOnly session only for captured payments', async () => {
  for (const status of ['authorized', 'captured']) {
    const {load, env} = fixture({payment: {status}}); env.NODE_ENV = 'production';
    const response = await load('app/api/razorpay/verify/route').POST(new globalThis.Request('https://site.invalid/api/razorpay/verify', {
      method: 'POST', headers: {origin: 'https://site.invalid'}, body: JSON.stringify({razorpay_order_id: input.orderId, razorpay_payment_id: input.paymentId, razorpay_signature: signature})}));
    if (status === 'captured') {
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie');
      for (const attribute of [/^course_access_session=/, /; HttpOnly/i, /; Secure/i, /; SameSite=lax/i]) assert.match(cookie, attribute);
      assert.deepEqual(await response.json(), {status: 'success'});
    } else { assert.equal(response.status, 202); assert.equal(response.headers.get('set-cookie'), null); }
  }
});
test('cross-origin recovery cannot issue or consume credentials', async () => {
  const {load, state} = fixture();
  for (const path of ['request', 'verify']) {
    const response = await load(`app/api/course-access/${path}/route`).POST(new globalThis.Request('https://site.invalid', {method: 'POST', headers: {origin: 'https://attacker.invalid'}, body: '{}'}));
    assert.equal(response.status, 403);
  }
  assert.equal(state.calls.length, 0);
});
test('test/live mode mismatch is rejected', () => {
  const {api, env} = fixture(); env.RAZORPAY_KEY_ID = 'rzp_live_fake';
  assert.throws(() => api.getCoursePricePaise(), /does not match/);
});
test('ordinary payment-record API cannot write success without reconciliation', async () => {
  const {api, state} = fixture();
  await assert.rejects(api.recordCoursePayment({orderId: 'order_test', paymentId: 'pay_test', name: null, email: null, amount: 49900, currency: 'INR', status: 'success'}), /Capture verification required/);
  assert.equal(state.writes, 0);
});

test('signed events explicitly belonging to another course are acknowledged without mutation', async () => {
  const {load, state} = fixture();
  const body = JSON.stringify({event: 'payment.captured', payload: {payment: {entity: {id: 'pay_test', order_id: 'order_test', notes: {course: 'another-course'}}}}});
  const sig = createHmac('sha256', 'test-webhook-secret').update(body).digest('hex');
  const response = await load('app/api/razorpay/webhook/route').POST(new globalThis.Request('https://site.invalid', {method: 'POST', body, headers: {'x-razorpay-signature': sig}}));
  assert.equal(response.status, 200); assert.equal(state.calls.length, 0);
});
