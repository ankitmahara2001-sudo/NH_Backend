import { formatDateRange, formatRupees } from '@nh/shared';
import { button, detailsTable, detailsText, escapeHtml, paragraph, renderLayout } from './layout.js';

// One function per email. Each returns { subject, html, text }.
// `branding` = { companyName, footerText, siteUrl, supportPhone }.

function travellersLabel(booking) {
  const parts = [];
  if (booking.adults) parts.push(`${booking.adults} adult${booking.adults > 1 ? 's' : ''}`);
  if (booking.children) parts.push(`${booking.children} child${booking.children > 1 ? 'ren' : ''}`);
  if (booking.units && !booking.adults && !booking.children) parts.push(`${booking.seats} travellers`);
  if (booking.infants) parts.push(`${booking.infants} infant${booking.infants > 1 ? 's' : ''}`);
  return parts.join(', ');
}

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

export function bookingConfirmedCustomerEmail({ booking, branding }) {
  const title = 'Your journey is confirmed!';
  const intro = `Hi ${booking.leadName}, thank you for booking with ${branding.companyName}. Your trip coordinator will call you 48 hours before departure.`;
  const link = `${branding.siteUrl}/account/bookings/${booking.bookingNumber}`;
  const rows = bookingRows(booking);
  return {
    subject: `Booking confirmed: ${booking.bookingNumber} · ${booking.packageTitle}`,
    ...renderLayout({
      title,
      bodyHtml: paragraph(intro) + detailsTable(rows) + button('View booking', link),
      bodyText: `${intro}\n\n${detailsText(rows)}\n\nView booking: ${link}`,
      branding,
    }),
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

export function balanceReceivedEmail({ booking, amount, branding }) {
  const fullyPaid = booking.balanceDue === 0;
  const title = fullyPaid ? 'Your booking is fully paid' : 'Payment received';
  const intro = `Hi ${booking.leadName}, we received ${formatRupees(amount)} for booking ${booking.bookingNumber}.`;
  const rows = bookingRows(booking);
  return {
    subject: `${title}: ${booking.bookingNumber}`,
    ...renderLayout({
      title,
      bodyHtml: paragraph(intro) + detailsTable(rows),
      bodyText: `${intro}\n\n${detailsText(rows)}`,
      branding,
    }),
  };
}

export function bookingCancelledEmail({ booking, reason, branding }) {
  const title = 'Your booking has been cancelled';
  const intro = `Hi ${booking.leadName}, booking ${booking.bookingNumber} for ${booking.packageTitle} has been cancelled.`;
  const refundNote = `Any refund due is processed to your original payment method. Questions? Call us on ${branding.supportPhone}.`;
  const rows = [
    ['Booking ID', booking.bookingNumber],
    ['Dates', formatDateRange(booking.travelDate, booking.endDate)],
    ...(reason ? [['Reason', reason]] : []),
  ];
  return {
    subject: `Booking cancelled: ${booking.bookingNumber}`,
    ...renderLayout({
      title,
      bodyHtml: paragraph(intro) + detailsTable(rows) + paragraph(refundNote),
      bodyText: `${intro}\n\n${detailsText(rows)}\n\n${refundNote}`,
      branding,
    }),
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
