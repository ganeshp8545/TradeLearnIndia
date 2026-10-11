// Real SQL tests. Creates and removes its OWN /tmp cluster, never uses .env or a remote DB.
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, execFile} from 'node:child_process';
import {mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir, userInfo} from 'node:os';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {fileURLToPath, URL} from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const taskDir = mkdtempSync(join(tmpdir(), 'tli-sql-test-'));
const versions = readdirSync('/usr/lib/postgresql').sort((a, b) => Number(b) - Number(a));
const bin = `/usr/lib/postgresql/${versions[0]}/bin`;
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PG')));
const args = ['-X', '-h', taskDir, '-p', '55439', '-U', userInfo().username, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'];
const run = (sql) => execFileSync(`${bin}/psql`, [...args, '-c', sql], {env, encoding: 'utf8', stdio: 'pipe'}).trim();
const runAsync = async sql => (await promisify(execFile)(`${bin}/psql`, [...args, '-c', sql], {env})).stdout.trim();
const capture = (order = 'order_test', payment = 'pay_test') => `select id from public.record_course_payment_v2('${order}','${payment}',null,'owner@example.test',49900,'INR','success',true)`;
let started = false;
before(() => {
  execFileSync(`${bin}/initdb`, ['-D', `${taskDir}/data`, '-A', 'trust', '--no-locale'], {env, stdio: 'pipe'});
  execFileSync(`${bin}/pg_ctl`, ['-D', `${taskDir}/data`, '-l', `${taskDir}/server.log`, '-o', `-k ${taskDir} -h '' -p 55439`, '-w', 'start'], {env, stdio: 'pipe'});
  started = true;
  run('create role anon; create role authenticated; create role service_role;');
  const migrations = readdirSync(`${root}/supabase/migrations`).filter(file => file.endsWith('.sql')).sort();
  for (const file of migrations) execFileSync(`${bin}/psql`, [...args, '-f', `${root}/supabase/migrations/${file}`], {env, stdio: 'pipe'});
});
after(() => {
  if (started) execFileSync(`${bin}/pg_ctl`, ['-D', `${taskDir}/data`, '-m', 'fast', '-w', 'stop'], {env, stdio: 'pipe'});
  rmSync(taskDir, {recursive: true, force: true});
});

test('migrations apply and public/client roles cannot access records or privileged RPCs', () => {
  for (const role of ['anon', 'authenticated']) {
    assert.equal(run(`select has_table_privilege('${role}','public.course_payments','SELECT')`), 'f');
    assert.equal(run(`select has_table_privilege('${role}','public.course_access_credentials','SELECT')`), 'f');
    assert.equal(run(`select has_function_privilege('${role}','public.record_course_payment_v2(text,text,text,text,integer,text,text,boolean)','EXECUTE')`), 'f');
  }
  assert.equal(run("select count(*) from pg_class where relname in ('course_payments','course_access_credentials','course_request_limits') and relrowsecurity"), '3');
  assert.equal(run("select has_function_privilege('service_role','public.record_course_payment(text,text,text,text,text,integer,text,text,text,text,text,boolean,timestamp with time zone)','EXECUTE')"), 'f');
  assert.equal(run("select has_table_privilege('service_role','public.course_payments','UPDATE')"), 'f');
});

test('SQL refuses success without explicit capture evidence', () => {
  assert.throws(() => run("select * from public.record_course_payment_v2('order_bad','pay_bad',null,null,49900,'INR','success',false)"));
  assert.equal(run("select count(*) from public.course_payments where razorpay_order_id='order_bad'"), '0');
});

test('concurrent webhook/callback capture creates one immutable payment grant', async () => {
  const results = await Promise.all(Array.from({length: 8}, () => runAsync(capture())));
  assert.equal(new Set(results).size, 1);
  assert.equal(run("select count(*) from public.course_payments where razorpay_order_id='order_test' and capture_verified_at is not null"), '1');
  const stamp = run("select capture_verified_at from public.course_payments where razorpay_order_id='order_test'");
  run("select * from public.record_course_payment_v2('order_test','pay_failed',null,'attacker@example.test',49900,'INR','failed',false)");
  assert.equal(run("select customer_email || ':' || payment_status || ':' || razorpay_payment_id from public.course_payments where razorpay_order_id='order_test'"), 'owner@example.test:success:pay_test');
  assert.equal(run("select capture_verified_at from public.course_payments where razorpay_order_id='order_test'"), stamp);
  assert.throws(() => run(capture('order_test', 'pay_other')));
  assert.throws(() => run(capture('order_other', 'pay_test')));
});

test('session issuance is idempotent and retry does not refresh expiry', async () => {
  const sql = `select public.issue_course_credential((${capture()}),'${'a'.repeat(64)}','session')`;
  assert.deepEqual(await Promise.all([runAsync(sql), runAsync(sql)]), ['t', 't']);
  const expiry = run(`select expires_at from public.course_access_credentials where token_hash='${'a'.repeat(64)}'`);
  run(sql);
  assert.equal(run(`select expires_at from public.course_access_credentials where token_hash='${'a'.repeat(64)}'`), expiry);
  assert.equal(run('select count(*) from public.course_access_credentials'), '1');
});

test('recovery exchange is atomic single-use under concurrency and preserves old sessions', async () => {
  run(`select public.issue_course_credential((${capture()}),'${'b'.repeat(64)}','recovery')`);
  const results = await Promise.all(['c', 'd'].map(letter => runAsync(`select count(*) from public.exchange_course_credential('${'b'.repeat(64)}','${letter.repeat(64)}')`)));
  assert.deepEqual(results.sort(), ['0', '1']);
  assert.equal(run(`select count(*) from public.lookup_course_credential('${'a'.repeat(64)}','session')`), '1');
  assert.equal(run("select count(*) from public.course_access_credentials where kind='session'"), '2');
});

test('expired and invalid recovery credentials are rejected by SQL', () => {
  run(`select public.issue_course_credential((${capture()}),'${'e'.repeat(64)}','recovery')`);
  run(`update public.course_access_credentials set expires_at=now()-interval '1 second' where token_hash='${'e'.repeat(64)}'`);
  for (const letter of ['e', 'f']) assert.equal(run(`select count(*) from public.exchange_course_credential('${letter.repeat(64)}','${'0'.repeat(64)}')`), '0');
});

test('historical rows require capture evidence before old credentials can be exchanged', () => {
  run(`insert into public.course_payments(razorpay_order_id,razorpay_payment_id,amount,currency,payment_status,course_name,course_access_granted,access_token_hash,access_token_expires_at)
    values('order_legacy','pay_legacy',29900,null,'success','Share Market Complete Course',true,'${'1'.repeat(64)}',now()+interval '1 hour')`);
  assert.equal(run(`select count(*) from public.exchange_course_credential('${'1'.repeat(64)}','${'2'.repeat(64)}')`), '0');
  run("select * from public.record_course_payment_v2('order_legacy','pay_legacy',null,'legacy@example.test',29900,'INR','success',true)");
  assert.equal(run(`select count(*) from public.exchange_course_credential('${'1'.repeat(64)}','${'2'.repeat(64)}')`), '1');
  assert.equal(run("select amount from public.course_payments where razorpay_order_id='order_legacy'"), '29900');
  assert.equal(run(`select count(*) from public.exchange_course_credential('${'1'.repeat(64)}','${'3'.repeat(64)}')`), '0');
});

test('rate limit is atomic across simultaneous requests', async () => {
  const results = await Promise.all(Array.from({length: 12}, () => runAsync(`select public.take_course_rate_limit('${'4'.repeat(64)}',3,3600)`)));
  assert.equal(results.filter(value => value === 't').length, 3);
  run(`update public.course_request_limits set window_started=now()-interval '2 hours' where bucket_key='${'4'.repeat(64)}'`);
  assert.equal(run(`select public.take_course_rate_limit('${'4'.repeat(64)}',3,3600)`), 't');
});

test('credential transaction rollback preserves unconsumed recovery link on insertion failure', () => {
  run(`select public.issue_course_credential((${capture()}),'${'5'.repeat(64)}','recovery')`);
  assert.throws(() => run(`select * from public.exchange_course_credential('${'5'.repeat(64)}','not-a-hash')`));
  assert.equal(run(`select count(*) from public.lookup_course_credential('${'5'.repeat(64)}','recovery')`), '1');
});

test('checkout replay stays expired even after credential cleanup', () => {
  const id = run(capture('order_expiry', 'pay_expiry'));
  run(`update public.course_payments set capture_verified_at=now()-interval '2 days' where id='${id}'`);
  const issue = `select public.issue_course_credential('${id}','${'6'.repeat(64)}','session',true)`;
  assert.equal(run(issue), 'f');
  run(`delete from public.course_access_credentials where token_hash='${'6'.repeat(64)}'`);
  assert.equal(run(issue), 'f');
  // Mailbox recovery can still issue a fresh random session for this entitlement.
  assert.equal(run(`select public.issue_course_credential('${id}','${'7'.repeat(64)}','session',false)`), 't');
});

test('service role can use capture RPC, but cannot call legacy status-only RPC', () => {
  assert.ok(run(`set role service_role; ${capture('order_service', 'pay_service')}`));
  assert.throws(() => run("set role service_role; select public.record_course_payment(null,'pay_unsafe','order_unsafe',null,null,49900,'success','Share Market Educational Course')"));
});

test('capture evidence constraint rejects missing currency or course identity', () => {
  assert.throws(() => run("update public.course_payments set currency=null where razorpay_order_id='order_test'"));
  assert.throws(() => run("update public.course_payments set course_slug=null where razorpay_order_id='order_test'"));
});
