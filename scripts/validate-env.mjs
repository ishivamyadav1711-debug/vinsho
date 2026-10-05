/**
 * VINSHO — Production Environment Validation Script
 *
 * Validates that all required environment variables are configured correctly
 * WITHOUT printing any secret values.
 *
 * Usage:
 *   node scripts/validate-env.mjs
 *   node scripts/validate-env.mjs --production
 */

import dotenv from 'dotenv';

// Load local files if present
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const isProdCheck = process.argv.includes('--production') || process.env.NODE_ENV === 'production';

// Checks definition

const CHECKS = [
  {
    name: 'DATABASE_URL',
    required: true,
    isSecret: true,
    validate: (val) => {
      if (!val.startsWith('postgresql://') && !val.startsWith('postgres://')) {
        return { valid: false, reason: 'Must be a valid postgresql:// connection URL' };
      }
      return { valid: true };
    }
  },
  {
    name: 'DIRECT_URL',
    required: true,
    isSecret: true,
    validate: (val) => {
      if (!val.startsWith('postgresql://') && !val.startsWith('postgres://')) {
        return { valid: false, reason: 'Must be a valid postgresql:// direct connection URL' };
      }
      return { valid: true };
    }
  },
  {
    name: 'SITE_URL',
    required: true,
    isSecret: false,
    validate: (val) => {
      if (isProdCheck && !val.startsWith('https://')) {
        return { valid: false, reason: 'Production SITE_URL must start with https://' };
      }
      return { valid: true };
    }
  },
  {
    name: 'COMMERCE_MODE',
    required: true,
    isSecret: false,
    validate: (val) => {
      if (val !== 'live' && val !== 'enquiry') {
        return { valid: false, reason: 'Must be either "live" or "enquiry"' };
      }
      return { valid: true };
    }
  },
  {
    name: 'ADMIN_EMAIL',
    required: true,
    isSecret: false,
    validate: (val) => {
      if (!val.includes('@') || !val.includes('.')) {
        return { valid: false, reason: 'Must be a valid email address' };
      }
      return { valid: true };
    }
  },
  {
    name: 'ADMIN_PASSWORD',
    required: true,
    isSecret: true,
    validate: (val) => {
      if (val.length < 8) {
        return { valid: false, reason: 'Must be at least 8 characters long' };
      }
      return { valid: true };
    }
  },
  {
    name: 'RAZORPAY_KEY_ID',
    required: true,
    isSecret: false,
    validate: (val) => {
      if (!val.startsWith('rzp_live_') && !val.startsWith('rzp_test_')) {
        return { valid: false, reason: 'Must start with rzp_live_ or rzp_test_' };
      }
      return { valid: true };
    }
  },
  {
    name: 'PUBLIC_RAZORPAY_KEY_ID',
    required: true,
    isSecret: false,
    validate: (val) => {
      if (!val.startsWith('rzp_live_') && !val.startsWith('rzp_test_')) {
        return { valid: false, reason: 'Must start with rzp_live_ or rzp_test_' };
      }
      return { valid: true };
    }
  },
  {
    name: 'RAZORPAY_KEY_SECRET',
    required: true,
    isSecret: true,
    validate: (val) => {
      if (val.length < 16) {
        return { valid: false, reason: 'Suspiciously short Razorpay key secret' };
      }
      return { valid: true };
    }
  },
  {
    name: 'RAZORPAY_WEBHOOK_SECRET',
    required: true,
    isSecret: true,
    validate: (val) => {
      if (val.length < 16) {
        return { valid: false, reason: 'Suspiciously short webhook secret' };
      }
      return { valid: true };
    }
  },
  {
    name: 'SMTP_HOST',
    required: false,
    isSecret: false
  },
  {
    name: 'SMTP_PORT',
    required: false,
    isSecret: false,
    validate: (val) => {
      const p = parseInt(val, 10);
      if (isNaN(p) || p <= 0 || p > 65535) {
        return { valid: false, reason: 'Must be a valid TCP port number' };
      }
      return { valid: true };
    }
  },
  {
    name: 'SMTP_USER',
    required: false,
    isSecret: false
  },
  {
    name: 'SMTP_PASS',
    required: false,
    isSecret: true
  },
  {
    name: 'SMTP_FROM',
    required: false,
    isSecret: false
  }
];

console.log('='.repeat(70));
console.log(`VINSHO Environment Configuration Audit (${isProdCheck ? 'PRODUCTION' : 'DEVELOPMENT'} mode)`);
console.log('='.repeat(70));

let hasErrors = false;
let missingRequired = 0;
let formatErrors = 0;

for (const item of CHECKS) {
  const rawValue = process.env[item.name];
  const isPresent = rawValue !== undefined && rawValue.trim().length > 0;

  if (!isPresent) {
    if (item.required) {
      console.log(`❌ [MISSING REQUIRED] ${item.name}`);
      missingRequired++;
      hasErrors = true;
    } else {
      console.log(`⚪ [OPTIONAL UNSET]  ${item.name}`);
    }
    continue;
  }

  // Format validation
  if (item.validate) {
    const res = item.validate(rawValue.trim());
    if (!res.valid) {
      console.log(`⚠️  [INVALID FORMAT]   ${item.name}: ${res.reason}`);
      formatErrors++;
      if (item.required) hasErrors = true;
      continue;
    }
  }

  const display = item.isSecret ? `[CONFIGURED: ${rawValue.trim().length} chars, redacted]` : `[CONFIGURED: ${rawValue.trim()}]`;
  console.log(`✅ [OK]              ${item.name} -> ${display}`);
}

console.log('-'.repeat(70));
if (hasErrors) {
  console.error(`FAILED: ${missingRequired} missing required variable(s), ${formatErrors} invalid format(s).`);
  process.exit(1);
} else {
  console.log('SUCCESS: All required environment variables are configured with valid formats.');
  process.exit(0);
}
