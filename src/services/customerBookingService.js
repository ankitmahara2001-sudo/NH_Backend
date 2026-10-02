import { AppError } from '../lib/AppError.js';
import { Booking, BookingTraveller, Package, Payment } from '../models/index.js';

const PACKAGE_INCLUDE = {
  model: Package,
  as: 'package',
  attributes: ['slug', 'coverImageUrl'],
};

const SUMMARY_FIELDS = [
  'bookingNumber',
  'packageTitle',
  'priceLabel',
  'travelDate',
  'endDate',
  'seats',
  'adults',
  'children',
  'infants',
  'units',
  'status',
  'paymentStatus',
  'totalAmount',
  'payNowAmount',
  'amountPaid',
  'balanceDue',
  'createdAt',
];

const DETAIL_FIELDS = [
  ...SUMMARY_FIELDS,
  'priceType',
  'pickupPoint',
  'leadName',
  'leadEmail',
  'leadPhone',
  'specialRequests',
  'unitPrice',
  'quantity',
  'subtotal',
  'couponCode',
  'discountAmount',
  'gstPercent',
  'gstAmount',
  'bookingAmountPercent',
  'refundedAmount',
  'cancelledAt',
  'cancelReason',
];

/** Copies the listed fields and adds the package slug + cover from the association. */
function serialize(booking, fields) {
  const result = {};
  for (const field of fields) result[field] = booking[field];
  result.packageSlug = booking.package?.slug ?? null;
  result.coverImageUrl = booking.package?.coverImageUrl ?? null;
  return result;
}

const serializeTraveller = ({ fullName, age, gender, isLead }) => ({ fullName, age, gender, isLead });

const serializePayment = ({ paymentType, method, amount, status, paidAt }) => ({
  paymentType,
  method,
  amount,
  status,
  paidAt,
});

/** GET /me/bookings — the customer's own bookings, newest first. */
export async function listCustomerBookings(customerId) {
  const bookings = await Booking.findAll({
    where: { customerId },
    attributes: ['id', ...SUMMARY_FIELDS],
    include: [PACKAGE_INCLUDE],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return bookings.map((booking) => serialize(booking, SUMMARY_FIELDS));
}

/** GET /me/bookings/:bookingNumber — 404 unless the booking belongs to this customer. */
export async function getCustomerBooking(customerId, bookingNumber) {
  const booking = await Booking.findOne({
    where: { customerId, bookingNumber },
    attributes: ['id', ...DETAIL_FIELDS],
    include: [
      PACKAGE_INCLUDE,
      {
        model: BookingTraveller,
        as: 'travellers',
        separate: true,
        order: [
          ['isLead', 'DESC'],
          ['id', 'ASC'],
        ],
      },
      { model: Payment, as: 'payments', separate: true, order: [['createdAt', 'ASC']] },
    ],
  });
  if (!booking) throw AppError.notFound('Booking not found.');
  return {
    ...serialize(booking, DETAIL_FIELDS),
    travellers: booking.travellers.map(serializeTraveller),
    payments: booking.payments.map(serializePayment),
  };
}
