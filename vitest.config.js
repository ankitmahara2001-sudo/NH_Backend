import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Dummy Razorpay credentials: tests mock the network calls and must never use real keys
    // from api/.env (dotenv does not override variables that are already set).
    env: {
      NODE_ENV: 'test',
      RAZORPAY_KEY_ID: 'rzp_test_dummy',
      RAZORPAY_KEY_SECRET: 'test_key_secret',
      RAZORPAY_WEBHOOK_SECRET: 'test_webhook_secret',
    },
    globalSetup: ['tests/globalSetup.js'],
    // Test files share one database, so they run one after another.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
