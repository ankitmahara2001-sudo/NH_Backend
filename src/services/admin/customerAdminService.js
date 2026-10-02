import { Op } from 'sequelize';
import { AppError } from '../../lib/AppError.js';
import { sequelize } from '../../lib/db.js';
import { paginationMeta, toLimitOffset } from '../../lib/pagination.js';
import { Booking, Customer } from '../../models/index.js';

const BOOKING_STATS = [
  [
    sequelize.literal(`(SELECT COUNT(*)::int FROM bookings b WHERE b.customer_id = "Customer"."id")`),
    'bookingsCount',
  ],
  [
    sequelize.literal(
      `(SELECT COALESCE(SUM(b.amount_paid - b.refunded_amount), 0)::int FROM bookings b WHERE b.customer_id = "Customer"."id")`,
    ),
    'totalPaid',
  ],
];

function serialize(customer) {
  const plain = customer.get({ plain: true });
  return { ...plain, bookingsCount: Number(plain.bookingsCount), totalPaid: Number(plain.totalPaid) };
}

/** GET /admin/customers?search=&page=&pageSize= */
export async function listCustomers({ search, page, pageSize }) {
  const where = search
    ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
        ],
      }
    : {};
  const { rows, count } = await Customer.findAndCountAll({
    where,
    attributes: { include: BOOKING_STATS },
    order: [['createdAt', 'DESC']],
    ...toLimitOffset(page, pageSize),
  });
  return { data: rows.map(serialize), meta: paginationMeta(page, pageSize, count) };
}

/** GET /admin/customers/:id — with their bookings, newest first. */
export async function getCustomer(id) {
  const customer = await Customer.findByPk(id, { attributes: { include: BOOKING_STATS } });
  if (!customer) throw AppError.notFound('Customer not found.');
  const bookings = await Booking.findAll({
    where: { customerId: id },
    order: [['createdAt', 'DESC']],
    attributes: [
      'id',
      'bookingNumber',
      'packageTitle',
      'travelDate',
      'status',
      'paymentStatus',
      'totalAmount',
      'amountPaid',
      'balanceDue',
      'createdAt',
    ],
  });
  return { ...serialize(customer), bookings: bookings.map((b) => b.get({ plain: true })) };
}
