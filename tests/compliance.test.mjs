import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHmac} from 'node:crypto';
import {URL} from 'node:url';
import {Buffer} from 'node:buffer';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('course facts and curriculum remain consistent', () => {
  const pricing = read('lib/course-pricing.ts');
  const data = read('lib/course-page-data.ts');
  assert.match(pricing, /COURSE_NAME = 'Share Market Educational Course'/);
  assert.match(pricing, /COURSE_PRICE_INR = 499/);
  assert.match(pricing, /COURSE_VIDEO_COUNT = 11/);
  const curriculum = data.split('curriculum: [')[1].split('] as CourseModule[]')[0];
  assert.equal((curriculum.match(/\{title: '/g) ?? []).length, 15); // 4 modules + 11 lessons
  assert.match(data, /COURSE_NAME/);
  assert.match(data, /COURSE_PRICE_INR/);
});

test('checkout requires acknowledgment and uses the trusted server amount', () => {
  const button = read('components/RazorpayCheckoutButton.tsx');
  const order = read('app/api/razorpay/create-order/route.ts');
  assert.match(button, /disabled=\{isLoading \|\| paymentPending \|\| !acknowledged\}/);
  assert.match(button, /checkoutInProgress\.current/);
  assert.match(button, /checkoutBusy/);
  assert.match(button, /\/terms/);
  assert.match(button, /\/refund-policy/);
  assert.match(button, /data\.amount !== COURSE_PRICE_PAISE/);
  assert.match(order, /amount = getCoursePricePaise\(\)/);
  assert.doesNotMatch(order, /request\.json\(/);
});

test('payment signatures reject tampered data', () => {
  const source = ts.transpileModule(read('lib/razorpay-webhook.ts'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
  const module = {exports: {}};
  vm.runInNewContext(source, {module, exports: module.exports, require: createRequire(import.meta.url), Buffer});
  const {verifyRazorpayOrderSignature, verifyRazorpayWebhookSignature} = module.exports;
  const secret = 'test-secret';
  const orderSignature = createHmac('sha256', secret).update('order_test|pay_test').digest('hex');
  assert.equal(verifyRazorpayOrderSignature('order_test', 'pay_test', orderSignature, secret), true);
  assert.equal(verifyRazorpayOrderSignature('order_other', 'pay_test', orderSignature, secret), false);
  const body = '{"event":"payment.captured"}';
  const webhookSignature = createHmac('sha256', secret).update(body).digest('hex');
  assert.equal(verifyRazorpayWebhookSignature(body, webhookSignature, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(body + ' ', webhookSignature, secret), false);
});

test('legacy route and course metadata point to current course page', () => {
  assert.match(read('app/courses/share-market-complete-course/page.tsx'), /permanentRedirect\('\/courses'\)/);
  const page = read('app/courses/page.tsx');
  assert.match(page, /canonical: '\/courses'/);
  assert.match(page, /coursePageData\.seo\.description/);
  assert.match(page, /coursePageData\.pricing\.priceInr/);
});

test('unsupported sales claims are absent from application copy', () => {
  const paths = ['lib/course-page-data.ts', 'components/CourseLandingPage.tsx', 'app/courses/page.tsx', 'app/courses/opengraph-image.tsx', 'components/RazorpayCheckoutButton.tsx'];
  const copy = paths.map(read).join('\n');
  assert.doesNotMatch(copy, /40\+ lectures|13\+ hours|₹1,900|74% off|save ₹1,401|limited.time offer|risk.free trading|sure.shot strategies|guaranteed income|guaranteed success|beginner to advanced/i);
});
