import { formatDate, formatDateRange, formatRupees } from '../domain/format.js';
import { PAYMENT_METHOD_LABELS, receiptNumber, travellersLabel } from './labels.js';
import {
  button,
  detailsTable,
  detailsText,
  escapeHtml,
  heading,
  paragraph,
  renderLayout,
  signature,
} from './layout.js';

// One function per email. Each returns { subject, html, text }.
// `branding` = { companyName, footerText, siteUrl, supportPhone, companyEmail, ... } (emailService).

function bookingRows(booking) {
  return [
    ['Booking ID', booking.bookingNumber],
    ['Package', booking.packageTitle],
    ['Option', booking.priceLabel],
    ['Dates', formatDateRange(booking.travelDate, booking.endDate)],
    ['Travellers', travellersLabel(booking)],
    ...(booking.pickupPoint ? [['Pickup', booking.pickupPoint]] : []),
    ['Total (incl. GST)', formatRupees(booking.totalAmount)],
    ['Paid', formatRupees(booking.amountPaid)],
    ['Balance due', formatRupees(booking.balanceDue)],
  ];
}

/** Trip details only (no money). */
function tripRows(booking) {
  return [
    ['Booking ID', booking.bookingNumber],
    ['Package', booking.packageTitle],
    ['Option', booking.priceLabel],
    ['Dates', formatDateRange(booking.travelDate, booking.endDate)],
    ['Travellers', travellersLabel(booking)],
    ...(booking.pickupPoint ? [['Pickup', booking.pickupPoint]] : []),
  ];
}

/** Line-by-line price: subtotal, coupon, special discount, GST, total, paid and balance. */
function priceRows(booking) {
  const minus = (paise) => `−${formatRupees(paise)}`;
  return [
    [`${formatRupees(booking.unitPrice)} × ${booking.quantity}`, formatRupees(booking.subtotal)],
    ...(booking.discountAmount ? [[`Coupon ${booking.couponCode}`, minus(booking.discountAmount)]] : []),
    ...(booking.manualDiscount
      ? [
          [
            booking.manualDiscountReason ? `Discount (${booking.manualDiscountReason})` : 'Special discount',
            minus(booking.manualDiscount),
          ],
        ]
      : []),
    [`GST (${booking.gstPercent}%)`, formatRupees(booking.gstAmount)],
    ['Total (incl. GST)', formatRupees(booking.totalAmount)],
    ['Paid so far', formatRupees(booking.amountPaid)],
    ['Balance due', formatRupees(booking.balanceDue)],
  ];
}

const methodLabel = (payment) => PAYMENT_METHOD_LABELS[payment.method] ?? payment.method;

/** The payment this email is a receipt for. */
function receiptRows(booking, payment) {
  return [
    ['Receipt no.', receiptNumber(booking, payment)],
    ['Amount received', formatRupees(payment.amount)],
    ['Paid by', methodLabel(payment)],
    ...(payment.razorpayPaymentId || payment.reference
      ? [['Reference', payment.razorpayPaymentId ?? payment.reference]]
      : []),
    ['Date', formatDate(payment.paidAt ?? payment.createdAt)],
  ];
}

function contactLine(branding) {
  const ways = [
    branding.companyEmail && `email us at ${branding.companyEmail}`,
    branding.supportPhone && `call us on ${branding.supportPhone}`,
  ].filter(Boolean);
  return ways.length
    ? `If you have any questions, please ${ways.join(' or ')}.`
    : 'If you have any questions, please get in touch with us.';
}

/**
 * A letter-style body: greeting, paragraphs, titled tables, an optional button, the contact line
 * and the sign-off. `parts` items are strings (paragraphs), [title, rows] (tables) or
 * { button: [label, href] }.
 */
function letter({ name, parts, branding }) {
  const closing = ['Warm regards,', `Team ${branding.companyName}`];
  const all = [`Dear ${name},`, ...parts.filter(Boolean), contactLine(branding)];
  const html = all
    .map((part) => {
      if (typeof part === 'string') return paragraph(part);
      if (Array.isArray(part)) return heading(part[0]) + detailsTable(part[1]);
      return button(...part.button);
    })
    .join('');
  const text = all
    .map((part) => {
      if (typeof part === 'string') return part;
      if (Array.isArray(part)) return `${part[0]}\n${detailsText(part[1])}`;
      return `${part.button[0]}: ${part.button[1]}`;
    })
    .join('\n\n');
  return { bodyHtml: html + signature(closing), bodyText: `${text}\n\n${closing.join('\n')}` };
}

export function otpEmail({ code, expiresInMinutes, branding }) {
  const title = 'Your login code';
  const lines = [
    `Use this code to log in to ${branding.companyName}. It expires in ${expiresInMinutes} minutes.`,
    "If you didn't ask for this code, you can ignore this email.",
  ];
  const codeHtml = `<p style="margin:8px 0 20px;font-size:32px;font-weight:800;letter-spacing:8px">${escapeHtml(code)}</p>`;
  return {
    subject: `${code} is your ${branding.companyName} login code`,
    ...renderLayout({
      title,
      bodyHtml: paragraph(lines[0]) + codeHtml + paragraph(lines[1]),
      bodyText: `${lines[0]}\n\nCode: ${code}\n\n${lines[1]}`,
      branding,
    }),
  };
}

/**
 * Booking confirmation and receipt for the first payment, for online (Razorpay) and admin-panel
 * (cash / UPI / bank transfer) bookings alike. The PDF receipt is attached by emailService.
 */
export function bookingConfirmedCustomerEmail({ booking, payment, branding }) {
  const title = 'Your booking is confirmed';
  const link = `${branding.siteUrl}/account/bookings/${booking.bookingNumber}`;
  const dates = formatDateRange(booking.travelDate, booking.endDate);
  const nextSteps =
    booking.balanceDue > 0
      ? `The balance of ${formatRupees(booking.balanceDue)} is payable before departure. Your trip coordinator will call you 48 hours before departure to share the final details.`
      : 'Your booking is fully paid. Your trip coordinator will call you 48 hours before departure to share the final details.';
  const body = letter({
    name: booking.leadName,
    branding,
    parts: [
      `Thank you for choosing ${branding.companyName}. We are delighted to confirm your booking for ${booking.packageTitle}, ${dates}.`,
      payment &&
        `We have received your payment of ${formatRupees(payment.amount)} (${methodLabel(payment)}). Your receipt ${receiptNumber(booking, payment)} is attached to this email as a PDF.`,
      payment && ['Payment received', receiptRows(booking, payment)],
      ['Booking summary', tripRows(booking)],
      ['Price details', priceRows(booking)],
      nextSteps,
      { button: ['View your booking', link] },
    ],
  });
  return {
    subject: `Booking confirmed – ${booking.bookingNumber} | ${booking.packageTitle}`,
    ...renderLayout({ title, ...body, branding }),
  };
}

export function bookingConfirmedAdminEmail({ booking, branding }) {
  const title = `New booking ${booking.bookingNumber}`;
  const rows = [
    ...bookingRows(booking),
    ['Lead traveller', booking.leadName],
    ['Email', booking.leadEmail],
    ['Phone', booking.leadPhone],
    ...(booking.couponCode ? [['Coupon', booking.couponCode]] : []),
  ];
  return {
    subject: `New booking: ${booking.bookingNumber} · ${booking.packageTitle}`,
    ...renderLayout({
      title,
      bodyHtml: paragraph('An advance payment was received.') + detailsTable(rows),
      bodyText: `An advance payment was received.\n\n${detailsText(rows)}`,
      branding,
    }),
  };
}

/** Receipt for a later (balance) payment recorded by the admin. The PDF receipt is attached. */
export function balanceReceivedEmail({ booking, payment, branding }) {
  const fullyPaid = booking.balanceDue <= 0;
  const title = fullyPaid ? 'Payment received – your booking is fully paid' : 'Payment received';
  const body = letter({
    name: booking.leadName,
    branding,
    parts: [
      `Thank you for your payment. We have received ${formatRupees(payment.amount)} (${methodLabel(payment)}) towards your booking ${booking.bookingNumber} for ${booking.packageTitle}.`,
      `Your receipt ${receiptNumber(booking, payment)} is attached to this email as a PDF.`,
      ['Payment received', receiptRows(booking, payment)],
      ['Price details', priceRows(booking)],
      fullyPaid
        ? 'Your booking is now fully paid and nothing further is due. We look forward to travelling with you.'
        : `The remaining balance of ${formatRupees(booking.balanceDue)} is payable before departure.`,
    ],
  });
  return {
    subject: fullyPaid
      ? `Payment received – ${booking.bookingNumber} is now fully paid`
      : `Payment received – ${booking.bookingNumber}`,
    ...renderLayout({ title, ...body, branding }),
  };
}

/** Sent when the admin cancels a booking. The PDF cancellation note is attached. */
export function bookingCancelledEmail({ booking, branding }) {
  const title = 'Your booking has been cancelled';
  const dates = formatDateRange(booking.travelDate, booking.endDate);
  const rows = [
    ['Booking ID', booking.bookingNumber],
    ['Package', booking.packageTitle],
    ['Travel dates', dates],
    ['Cancelled on', formatDate(booking.cancelledAt)],
    ...(booking.cancelReason ? [['Reason', booking.cancelReason]] : []),
    ['Amount paid', formatRupees(booking.amountPaid)],
  ];
  const body = letter({
    name: booking.leadName,
    branding,
    parts: [
      `We are writing to confirm that your booking ${booking.bookingNumber} for ${booking.packageTitle} (${dates}) has been cancelled.`,
      ['Cancellation details', rows],
      booking.amountPaid > 0
        ? `You have paid ${formatRupees(booking.amountPaid)} towards this booking. Any refund due will be processed in line with our cancellation policy, and our team will contact you shortly with the details.`
        : 'As no payment was received for this booking, no refund is due.',
      'A cancellation note is attached to this email for your records.',
      'We are sorry this trip could not go ahead and hope to welcome you on a journey with us soon.',
    ],
  });
  return {
    subject: `Booking cancelled – ${booking.bookingNumber} | ${booking.packageTitle}`,
    ...renderLayout({ title, ...body, branding }),
  };
}

export function newEnquiryEmail({ enquiry, branding }) {
  const title = `New enquiry from ${enquiry.name}`;
  const rows = [
    ['Name', enquiry.name],
    ['Email', enquiry.email],
    ['Phone', enquiry.phone],
    ['Destination', enquiry.destination || '—'],
    ['Travellers', enquiry.travellers || '—'],
    ['Travel month', enquiry.travelMonth || '—'],
  ];
  const message = enquiry.message || '(no message)';
  return {
    subject: `New enquiry: ${enquiry.name}`,
    ...renderLayout({
      title,
      bodyHtml: detailsTable(rows) + paragraph(message),
      bodyText: `${detailsText(rows)}\n\nMessage:\n${message}`,
      branding,
    }),
  };
}
