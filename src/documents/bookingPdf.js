import PDFDocument from 'pdfkit';
import { formatDate, formatDateRange, formatRupees } from '../domain/format.js';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  receiptNumber,
  travellersLabel,
} from '../emails/labels.js';

// Printable PDFs attached to customer emails: a payment receipt and a cancellation note.
// Built with PDFKit's standard Helvetica, which has no ₹ glyph, so amounts read "Rs. 12,999".

const COLORS = {
  navy: '#0F1B2D',
  gold: '#C8893A',
  text: '#1D2230',
  muted: '#5E6470',
  border: '#E6E1D8',
  soft: '#F7F5F1',
};
const MARGIN = 50;
const FONT = 'Helvetica';
const BOLD = 'Helvetica-Bold';

const money = (paise) => formatRupees(paise).replace('₹', 'Rs. ');

function toBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

function newDocument(title, branding) {
  return new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: 40, left: MARGIN, right: MARGIN },
    info: { Title: title, Author: branding.legalName || branding.companyName },
  });
}

const contentWidth = (doc) => doc.page.width - MARGIN * 2;

function rule(doc, gap = 14) {
  doc.y += gap / 2;
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(doc.page.width - MARGIN, doc.y)
    .lineWidth(0.7)
    .strokeColor(COLORS.border)
    .stroke();
  doc.y += gap / 2;
}

/** Company block on the left, document title and number on the right. */
function header(doc, branding, { title, meta }) {
  const width = contentWidth(doc);
  doc.rect(0, 0, doc.page.width, 6).fill(COLORS.gold);

  const top = MARGIN;
  doc
    .font(BOLD)
    .fontSize(18)
    .fillColor(COLORS.navy)
    .text(branding.companyName, MARGIN, top, { width: width * 0.6 });
  const contact = [
    branding.legalName && branding.legalName !== branding.companyName ? branding.legalName : null,
    ...(branding.address ? branding.address.split('\n') : []),
    [branding.phone, branding.companyEmail].filter(Boolean).join('   |   '),
  ].filter(Boolean);
  doc
    .font(FONT)
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(contact.join('\n'), { width: width * 0.6, lineGap: 1.5 });
  const leftBottom = doc.y;

  doc
    .font(BOLD)
    .fontSize(15)
    .fillColor(COLORS.gold)
    .text(title, MARGIN, top + 2, {
      width,
      align: 'right',
      characterSpacing: 1.2,
    });
  doc.moveDown(0.5);
  // Label and value in two right-aligned columns ("Receipt no.  NH-2026-00042/7").
  const valueWidth = 120;
  const labelWidth = 90;
  const right = MARGIN + width;
  for (const [label, value] of meta) {
    const y = doc.y;
    doc
      .font(FONT)
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(label, right - valueWidth - labelWidth - 8, y, { width: labelWidth, align: 'right' });
    doc
      .font(BOLD)
      .fillColor(COLORS.text)
      .text(value, right - valueWidth, y, { width: valueWidth, align: 'right' });
    doc.y = y + 13;
  }
  doc.y = Math.max(leftBottom, doc.y) + 6;
  rule(doc, 20);
}

function sectionTitle(doc, text, x = MARGIN, width = contentWidth(doc)) {
  doc.font(BOLD).fontSize(8.5).fillColor(COLORS.gold).text(text.toUpperCase(), x, doc.y, {
    width,
    characterSpacing: 1,
  });
  doc.moveDown(0.5);
}

/** Label/value rows in a column starting at x. */
function detailRows(doc, rows, x, width, labelWidth = 92) {
  for (const [label, value] of rows) {
    const y = doc.y;
    doc.font(FONT).fontSize(9).fillColor(COLORS.muted).text(label, x, y, { width: labelWidth });
    const labelEnd = doc.y;
    doc
      .font(BOLD)
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(String(value ?? '-'), x + labelWidth, y, {
        width: width - labelWidth,
      });
    doc.y = Math.max(labelEnd, doc.y) + 4;
  }
}

/** Two titled columns side by side. */
function twoColumns(doc, left, right) {
  const gap = 24;
  const width = (contentWidth(doc) - gap) / 2;
  const top = doc.y;
  sectionTitle(doc, left.title, MARGIN, width);
  detailRows(doc, left.rows, MARGIN, width, left.labelWidth);
  const leftEnd = doc.y;
  doc.y = top;
  const x = MARGIN + width + gap;
  sectionTitle(doc, right.title, x, width);
  detailRows(doc, right.rows, x, width, right.labelWidth);
  doc.y = Math.max(leftEnd, doc.y);
  rule(doc, 22);
}

/** A highlighted box, e.g. the amount received. */
function highlight(doc, { label, value, rows }) {
  const width = contentWidth(doc);
  const top = doc.y;
  const height = 30 + rows.length * 14;
  doc.roundedRect(MARGIN, top, width, height, 6).fill(COLORS.soft);
  doc
    .font(FONT)
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(label, MARGIN + 16, top + 12, { width: width / 2 });
  doc
    .font(BOLD)
    .fontSize(20)
    .fillColor(COLORS.navy)
    .text(value, MARGIN + 16, top + 26, { width: width / 2 });
  doc.y = top + 12;
  detailRows(doc, rows, MARGIN + width / 2, width / 2 - 16, 90);
  doc.y = top + height;
  rule(doc, 22);
}

/** Description/amount table. `rows` are [label, amount, { bold, shaded }]. */
function amountTable(doc, rows) {
  const width = contentWidth(doc);
  for (const [label, amount, style = {}] of rows) {
    const y = doc.y;
    if (style.shaded) doc.rect(MARGIN, y - 4, width, 20).fill(COLORS.soft);
    const font = style.bold ? BOLD : FONT;
    doc
      .font(font)
      .fontSize(9.5)
      .fillColor(COLORS.text)
      .text(label, MARGIN + 8, y, { width: width * 0.65 });
    doc
      .font(font)
      .fontSize(9.5)
      .text(amount, MARGIN, y, { width: width - 8, align: 'right' });
    doc.y = y + 20;
    if (!style.shaded) {
      doc
        .moveTo(MARGIN, doc.y - 5)
        .lineTo(MARGIN + width, doc.y - 5)
        .lineWidth(0.5)
        .strokeColor(COLORS.border)
        .stroke();
    }
  }
  doc.y += 6;
}

function priceRows(booking) {
  return [
    [
      `${booking.packageTitle} - ${booking.priceLabel} (${money(booking.unitPrice)} x ${booking.quantity})`,
      money(booking.subtotal),
    ],
    ...(booking.discountAmount
      ? [[`Coupon ${booking.couponCode}`, `- ${money(booking.discountAmount)}`]]
      : []),
    ...(booking.manualDiscount
      ? [
          [
            booking.manualDiscountReason ? `Discount (${booking.manualDiscountReason})` : 'Special discount',
            `- ${money(booking.manualDiscount)}`,
          ],
        ]
      : []),
    [`GST (${booking.gstPercent}%)`, money(booking.gstAmount)],
    ['Total (incl. GST)', money(booking.totalAmount), { bold: true, shaded: true }],
    ['Paid to date', money(booking.amountPaid)],
    ...(booking.refundedAmount ? [['Refunded', money(booking.refundedAmount)]] : []),
    ['Balance due', money(booking.balanceDue), { bold: true }],
  ];
}

function paymentHistory(doc, payments) {
  if (!payments.length) return;
  const width = contentWidth(doc);
  sectionTitle(doc, 'Payment history');
  const columns = [
    ['Date', 0.16],
    ['Type', 0.2],
    ['Method', 0.2],
    ['Reference', 0.26],
    ['Amount', 0.18, 'right'],
  ];
  const drawRow = (cells, font, color) => {
    const y = doc.y;
    let x = MARGIN;
    cells.forEach((cell, index) => {
      const [, share, align = 'left'] = columns[index];
      doc
        .font(font)
        .fontSize(8.5)
        .fillColor(color)
        .text(cell, x + 4, y, { width: width * share - 8, align });
      x += width * share;
    });
    doc.y = y + 16;
  };
  drawRow(
    columns.map(([title]) => title),
    BOLD,
    COLORS.muted,
  );
  for (const p of payments) {
    drawRow(
      [
        formatDate(p.paidAt ?? p.createdAt),
        PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType,
        PAYMENT_METHOD_LABELS[p.method] ?? p.method,
        p.razorpayPaymentId ?? p.reference ?? '-',
        `${p.paymentType === 'refund' ? '- ' : ''}${money(p.amount)}`,
      ],
      FONT,
      COLORS.text,
    );
  }
  doc.y += 4;
}

function footer(doc, branding, note) {
  const width = contentWidth(doc);
  const y = doc.page.height - 78;
  doc
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + width, y)
    .lineWidth(0.7)
    .strokeColor(COLORS.border)
    .stroke();
  const contact = [branding.supportPhone || branding.phone, branding.companyEmail, branding.siteUrl]
    .filter(Boolean)
    .join('   |   ');
  doc
    .font(FONT)
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(note, MARGIN, y + 10, { width, align: 'center' });
  if (contact) doc.text(contact, { width, align: 'center' });
}

function customerColumns(booking) {
  return {
    left: {
      title: 'Billed to',
      labelWidth: 50,
      rows: [
        ['Name', booking.leadName],
        ['Email', booking.leadEmail],
        ['Phone', booking.leadPhone],
      ],
    },
    right: {
      title: 'Booking',
      labelWidth: 72,
      rows: [
        ['Booking ID', booking.bookingNumber],
        ['Package', booking.packageTitle],
        ['Travel dates', formatDateRange(booking.travelDate, booking.endDate)],
        ['Travellers', travellersLabel(booking)],
        ...(booking.pickupPoint ? [['Pickup', booking.pickupPoint]] : []),
      ],
    },
  };
}

/**
 * Receipt for one payment, with the booking's full price and every payment so far.
 * @returns {Promise<Buffer>}
 */
export function buildReceiptPdf({ booking, payment, payments, branding }) {
  const doc = newDocument(`Receipt ${receiptNumber(booking, payment)}`, branding);
  header(doc, branding, {
    title: 'PAYMENT RECEIPT',
    meta: [
      ['Receipt no.', receiptNumber(booking, payment)],
      ['Date', formatDate(payment.paidAt ?? payment.createdAt)],
    ],
  });
  const { left, right } = customerColumns(booking);
  twoColumns(doc, left, right);
  highlight(doc, {
    label: 'Amount received',
    value: money(payment.amount),
    rows: [
      ['Paid by', PAYMENT_METHOD_LABELS[payment.method] ?? payment.method],
      ...(payment.razorpayPaymentId || payment.reference
        ? [['Reference', payment.razorpayPaymentId ?? payment.reference]]
        : []),
      ['Towards', PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType],
    ],
  });
  sectionTitle(doc, 'Price details');
  amountTable(doc, priceRows(booking));
  paymentHistory(doc, payments);
  footer(
    doc,
    branding,
    booking.balanceDue > 0
      ? `The balance of ${money(booking.balanceDue)} is payable before departure. This is a computer-generated receipt and needs no signature.`
      : 'This booking is fully paid. This is a computer-generated receipt and needs no signature.',
  );
  return toBuffer(doc);
}

/**
 * Cancellation note: what was booked, why it was cancelled and what was paid.
 * @returns {Promise<Buffer>}
 */
export function buildCancellationPdf({ booking, payments, branding }) {
  const doc = newDocument(`Cancellation ${booking.bookingNumber}`, branding);
  header(doc, branding, {
    title: 'BOOKING CANCELLATION',
    meta: [
      ['Booking ID', booking.bookingNumber],
      ['Cancelled on', formatDate(booking.cancelledAt)],
    ],
  });
  const { left, right } = customerColumns(booking);
  twoColumns(doc, left, right);
  highlight(doc, {
    label: 'Status',
    value: 'Cancelled',
    rows: [
      ['Cancelled on', formatDate(booking.cancelledAt)],
      ['Amount paid', money(booking.amountPaid)],
    ],
  });
  sectionTitle(doc, 'Reason for cancellation');
  doc
    .font(FONT)
    .fontSize(9.5)
    .fillColor(COLORS.text)
    .text(booking.cancelReason || '-', MARGIN, doc.y, {
      width: contentWidth(doc),
      lineGap: 2,
    });
  rule(doc, 22);
  sectionTitle(doc, 'Price details');
  amountTable(
    doc,
    priceRows(booking).filter(([label]) => label !== 'Balance due'),
  );
  paymentHistory(doc, payments);
  footer(
    doc,
    branding,
    booking.amountPaid > 0
      ? 'Any refund due is processed as per our cancellation policy. This is a computer-generated document and needs no signature.'
      : 'No payment was received for this booking. This is a computer-generated document and needs no signature.',
  );
  return toBuffer(doc);
}
