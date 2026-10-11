import { createBooking } from '../services/bookingService.js';
import { getCustomerBooking, listCustomerBookings } from '../services/customerBookingService.js';
import { verifyPayment } from '../services/paymentService.js';

export async function myBookings(req, res) {
  res.json({ data: await listCustomerBookings(req.customer.id) });
}

export async function myBooking(req, res) {
  res.json({ data: await getCustomerBooking(req.customer.id, req.validated.params.bookingNumber) });
}

/** POST /bookings — pending booking + Razorpay order for the booking amount. */
export async function create(req, res) {
  res.status(201).json({ data: await createBooking(req.customer, req.validated.body) });
}

/** POST /payments/verify — checkout success handler. */
export async function verify(req, res) {
  res.json({ data: await verifyPayment(req.customer, req.validated.body) });
}
