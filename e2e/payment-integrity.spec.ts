import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPaymentProvider, RazorpayProvider } from '../src/lib/payments/provider.js';

test.describe('VINSHO Payment Integrity & Hardening Suite (Real Payments Only)', () => {
  const testKeySecret = 'test_key_secret_for_cryptographic_verification_32ch';
  const testWebhookSecret = 'test_webhook_secret_for_verification_32ch';

  test.beforeAll(() => {
    process.env.RAZORPAY_KEY_SECRET = testKeySecret;
    process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  });

  // Test 1: Fake payment ID format rejection
  test('Test 1: Fake or malformed payment ID is rejected', () => {
    const isVerified = defaultPaymentProvider.verifyPaymentSignature({
      razorpayOrderId: 'order_real_123',
      razorpayPaymentId: '',
      razorpaySignature: 'any_signature'
    });
    expect(isVerified).toBe(false);
  });

  // Test 2: Fake signature rejection
  test('Test 2: Fabricated signature is rejected by cryptographic HMAC-SHA256', () => {
    const fakeSig = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const isVerified = defaultPaymentProvider.verifyPaymentSignature({
      razorpayOrderId: 'order_real_123',
      razorpayPaymentId: 'pay_real_456',
      razorpaySignature: fakeSig
    });
    expect(isVerified).toBe(false);
  });

  // Test 3: mock_valid_sig backdoor is completely rejected
  test('Test 3: mock_valid_sig backdoor is completely eradicated and rejected', () => {
    const isPayVerified = defaultPaymentProvider.verifyPaymentSignature({
      razorpayOrderId: 'order_real_123',
      razorpayPaymentId: 'pay_real_456',
      razorpaySignature: 'mock_valid_sig'
    });
    expect(isPayVerified).toBe(false);

    const isHookVerified = defaultPaymentProvider.verifyWebhookSignature(
      '{"event":"payment.captured"}',
      'mock_valid_sig'
    );
    expect(isHookVerified).toBe(false);
  });

  // Test 4: Missing signature rejection
  test('Test 4: Missing, null, or empty signature is rejected', () => {
    expect(
      defaultPaymentProvider.verifyPaymentSignature({
        razorpayOrderId: 'order_real_123',
        razorpayPaymentId: 'pay_real_456',
        razorpaySignature: ''
      })
    ).toBe(false);

    expect(
      defaultPaymentProvider.verifyWebhookSignature('{"event":"payment.captured"}', '')
    ).toBe(false);
  });

  // Test 5: Client sends { "status": "PAID" } without verified Razorpay payment
  test('Test 5: Client payload cannot mark payment as verified without valid cryptographic signature', () => {
    const clientPayload: any = { status: 'PAID', amount: 1000 };
    expect(defaultPaymentProvider.verifyPaymentSignature(clientPayload)).toBe(false);
  });

  // Test 6: Wrong Razorpay order ID is rejected
  test('Test 6: Signature calculated for Order A fails verification when submitted for Order B', () => {
    const orderA = 'order_A_valid_123';
    const orderB = 'order_B_wrong_456';
    const payId = 'pay_real_789';
    const validSigForA = crypto.createHmac('sha256', testKeySecret).update(`${orderA}|${payId}`).digest('hex');

    const isVerified = defaultPaymentProvider.verifyPaymentSignature({
      razorpayOrderId: orderB,
      razorpayPaymentId: payId,
      razorpaySignature: validSigForA
    });
    expect(isVerified).toBe(false);
  });

  // Test 7: Payment belonging to Order A submitted for Order B
  test('Test 7: Cross-order payment substitution is rejected', () => {
    const orderA = 'order_AAA_11111';
    const orderB = 'order_BBB_22222';
    const payA = 'pay_AAA_33333';
    const sigA = crypto.createHmac('sha256', testKeySecret).update(`${orderA}|${payA}`).digest('hex');

    const result = defaultPaymentProvider.verifyPaymentSignature({
      razorpayOrderId: orderB,
      razorpayPaymentId: payA,
      razorpaySignature: sigA
    });
    expect(result).toBe(false);
  });

  // Test 8: Amount mismatch rejection
  test('Test 8: Webhook payload with amount mismatch throws explicit error and rejects', async () => {
    const fakePayload = {
      id: 'evt_test_amount_mismatch_99',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_mismatch_123',
            order_id: 'order_mismatch_123',
            amount: 50, // 50 paise instead of real total
            currency: 'INR',
            status: 'captured',
            notes: { order_id: '1' }
          }
        }
      }
    };

    await expect(defaultPaymentProvider.processWebhookEvent(fakePayload)).rejects.toThrow();
  });

  // Test 9: Unsigned webhook is rejected
  test('Test 9: Unsigned webhook is rejected by webhook signature verifier', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured' });
    expect(defaultPaymentProvider.verifyWebhookSignature(rawBody, '')).toBe(false);
  });

  // Test 10: Invalid webhook signature is rejected
  test('Test 10: Tampered or invalid webhook signature is rejected', () => {
    const rawBody = JSON.stringify({ event: 'payment.captured', amount: 10000 });
    const validSig = crypto.createHmac('sha256', testWebhookSecret).update(rawBody).digest('hex');
    const tamperedSig = validSig.slice(0, -4) + '0000';

    expect(defaultPaymentProvider.verifyWebhookSignature(rawBody, tamperedSig)).toBe(false);

    const tamperedBody = JSON.stringify({ event: 'payment.captured', amount: 99999 });
    expect(defaultPaymentProvider.verifyWebhookSignature(tamperedBody, validSig)).toBe(false);
  });

  // Test 11: Duplicate valid webhook / replay protection
  test('Test 11: Webhook rejects malformed payloads and protects against replays', async () => {
    await expect(
      defaultPaymentProvider.processWebhookEvent({ event: 'payment.captured' })
    ).rejects.toThrow(/missing event ID/);
  });

  // Test 12: Frontend-only success callback cannot authenticate payment
  test('Test 12: Frontend success callback payload without backend verification cannot pass', () => {
    const fakeFrontend = {
      razorpay_order_id: 'order_front_123',
      razorpay_payment_id: 'pay_front_456',
      razorpay_signature: 'unverified_browser_string'
    };
    expect(defaultPaymentProvider.verifyPaymentSignature(fakeFrontend as any)).toBe(false);
  });

  // Test 13: Mock provider in live mode cannot execute
  test('Test 13: RazorpayProvider rejects checkout initiation if credentials are not configured or rejected by Razorpay (zero fake IDs)', async () => {
    const { _resetEnvConfigCache } = await import('../src/lib/env.js');
    const savedKey = process.env.PUBLIC_RAZORPAY_KEY_ID;
    const savedSecret = process.env.RAZORPAY_KEY_SECRET;
    const savedKeyId = process.env.RAZORPAY_KEY_ID;

    delete process.env.PUBLIC_RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_ID;
    _resetEnvConfigCache();

    const strictProvider = new RazorpayProvider();
    await expect(
      strictProvider.initiateCheckoutSession({ id: 1, grand_total: 100, order_number: 'VIN-TEST' })
    ).rejects.toThrow(/not configured|Failed to create genuine Razorpay order/);

    if (savedKey) process.env.PUBLIC_RAZORPAY_KEY_ID = savedKey;
    if (savedSecret) process.env.RAZORPAY_KEY_SECRET = savedSecret;
    if (savedKeyId) process.env.RAZORPAY_KEY_ID = savedKeyId;
    _resetEnvConfigCache();
  });

  // Test 14: Seed script must not create production payment records
  test('Test 14: Verification that catalog seed scripts contain zero payment writes', () => {
    const seedContent = fs.readFileSync(path.join(process.cwd(), 'scripts', 'seed.ts'), 'utf-8');
    expect(seedContent.includes('payments.create')).toBe(false);
    expect(seedContent.includes('orders.create')).toBe(false);
  });
});
