import { handleRazorpayWebhook } from '../services/paymentService.js';

/** POST /webhooks/razorpay — req.body is the raw Buffer (express.raw in app.js). */
export async function razorpayWebhook(req, res) {
  await handleRazorpayWebhook(req.body, req.get('X-Razorpay-Signature'));
  res.json({ data: { received: true } });
}
