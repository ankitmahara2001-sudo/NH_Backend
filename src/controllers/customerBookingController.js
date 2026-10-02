import { getCustomerBooking, listCustomerBookings } from '../services/customerBookingService.js';

export async function myBookings(req, res) {
  res.json({ data: await listCustomerBookings(req.customer.id) });
}

export async function myBooking(req, res) {
  res.json({ data: await getCustomerBooking(req.customer.id, req.validated.params.bookingNumber) });
}
