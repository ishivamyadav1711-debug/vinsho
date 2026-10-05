import assert from 'node:assert';
import path from 'node:path';
import Database from 'better-sqlite3';

console.log('--- Running VINSHO Contact Form Validation Test Suite ---');

const dbPath = path.join(process.cwd(), 'data', 'vinsho.db');
const db = new Database(dbPath);

// Pure validation logic mirroring enquiries.ts endpoint
function validateEnquiryPayload(rawBody) {
  let body;
  try {
    if (typeof rawBody === 'string') {
      body = JSON.parse(rawBody);
    } else {
      body = rawBody;
    }
  } catch {
    return { status: 400, error: 'Invalid or missing JSON request body.', details: { body: 'Request payload must be a valid JSON object.' } };
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { status: 400, error: 'Request body must be a valid JSON object.', details: { body: 'Expected a JSON object payload.' } };
  }

  const ALLOWED_FIELDS = new Set([
    'name', 'phone', 'email', 'message', 'company', 'subject',
    'productSlug', 'collectionKey', 'subcategoryKey', 'source',
    'website_url', 'dpdp_consent'
  ]);

  const bodyKeys = Object.keys(body);
  const unexpectedFields = bodyKeys.filter(key => !ALLOWED_FIELDS.has(key));
  if (unexpectedFields.length > 0) {
    return { status: 400, error: `Validation failed: unexpected field(s) present in request (${unexpectedFields.join(', ')}).`, details: { unexpectedFields } };
  }

  const typeErrors = {};
  for (const key of bodyKeys) {
    const val = body[key];
    if (key === 'dpdp_consent') {
      if (val !== undefined && val !== null && typeof val !== 'boolean' && typeof val !== 'string') {
        typeErrors[key] = `${key} must be a boolean or string value.`;
      }
    } else {
      if (val !== undefined && val !== null && typeof val !== 'string') {
        typeErrors[key] = `${key} must be a string value.`;
      }
    }
  }

  if (Object.keys(typeErrors).length > 0) {
    return { status: 400, error: 'Validation failed: invalid input data types.', details: typeErrors };
  }

  const { name, phone, email, message, productSlug } = body;
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPhone = (phone || '').trim();
  const cleanMessage = (message || '').trim();

  const fieldErrors = {};

  if (!cleanName) {
    fieldErrors.name = 'Name is required.';
  }

  if (!cleanEmail && !cleanPhone) {
    fieldErrors.email = 'Email address or Phone number is required.';
  } else {
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      fieldErrors.email = 'Please enter a valid email address.';
    }
    if (cleanPhone && !/^[\+\d\s\-\(\)]{7,20}$/.test(cleanPhone)) {
      fieldErrors.phone = 'Please enter a valid phone number.';
    }
  }

  if (!cleanMessage && !productSlug) {
    fieldErrors.message = 'Message is required.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: 400, error: Object.values(fieldErrors).join(' '), details: fieldErrors };
  }

  return { status: 200, success: true, message: 'Thank you! Your message has been received. Our team aims to respond to all inquiries within 24 hours.' };
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

// 1. Valid Enquiry
runTest('1. Valid Enquiry (HTTP 200)', () => {
  const res = validateEnquiryPayload({ name: 'John Doe', email: 'john@example.com', message: 'Hello VINSHO', subject: 'Inquiry' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.success, true);
  assert(res.message.includes('24 hours'));
});

// 2. Missing Name
runTest('2. Missing Name (HTTP 400)', () => {
  const res = validateEnquiryPayload({ email: 'john@example.com', message: 'Hello' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.details.name, 'Name is required.');
});

// 3. Missing Email
runTest('3. Missing Email and Phone (HTTP 400)', () => {
  const res = validateEnquiryPayload({ name: 'John Doe', message: 'Hello' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.details.email, 'Email address or Phone number is required.');
});

// 4. Invalid Email
runTest('4. Invalid Email (HTTP 400)', () => {
  const res = validateEnquiryPayload({ name: 'John Doe', email: 'invalid-email-format', message: 'Hello' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.details.email, 'Please enter a valid email address.');
});

// 5. Missing Message
runTest('5. Missing Message (HTTP 400)', () => {
  const res = validateEnquiryPayload({ name: 'John Doe', email: 'john@example.com' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.details.message, 'Message is required.');
});

// 6. Empty Request Body
runTest('6. Empty Request Body (HTTP 400)', () => {
  const res = validateEnquiryPayload('');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.error, 'Invalid or missing JSON request body.');
});

// 7. Malformed Input (JSON Syntax & Primitive Types)
runTest('7. Malformed Input (HTTP 400)', () => {
  const res1 = validateEnquiryPayload('{name:');
  assert.strictEqual(res1.status, 400);

  const res2 = validateEnquiryPayload({ name: 12345, email: 'john@example.com', message: 'Hi' });
  assert.strictEqual(res2.status, 400);
  assert.strictEqual(res2.details.name, 'name must be a string value.');
});

// 8. Unexpected/Extra Fields
runTest('8. Unexpected Extra Fields (HTTP 400)', () => {
  const res = validateEnquiryPayload({ name: 'John Doe', email: 'john@example.com', message: 'Hi', hackerField: 'injection' });
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(res.details.unexpectedFields, ['hackerField']);
});

console.log(`\nTest Results: ${passed} Passed, ${failed} Failed.`);
if (failed > 0) process.exit(1);
