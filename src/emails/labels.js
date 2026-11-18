// Customer-facing labels shared by email templates and PDF documents.

export const PAYMENT_METHOD_LABELS = {
  razorpay: 'Online (Razorpay)',
  cash: 'Cash',
  upi: 'UPI',
  bank_transfer: 'Bank transfer',
  other: 'Other',
};

export const PAYMENT_TYPE_LABELS = {
  advance: 'Booking amount',
  balance: 'Balance payment',
  refund: 'Refund',
};

export function travellersLabel(booking) {
  const parts = [];
  if (booking.adults) parts.push(`${booking.adults} adult${booking.adults > 1 ? 's' : ''}`);
  if (booking.children) parts.push(`${booking.children} child${booking.children > 1 ? 'ren' : ''}`);
  if (booking.units && !booking.adults && !booking.children) parts.push(`${booking.seats} travellers`);
  if (booking.infants) parts.push(`${booking.infants} infant${booking.infants > 1 ? 's' : ''}`);
  return parts.join(', ');
}

/** Receipt number printed on emails and PDFs: <booking number>/<payment id>. */
export const receiptNumber = (booking, payment) => `${booking.bookingNumber}/${payment.id}`;
