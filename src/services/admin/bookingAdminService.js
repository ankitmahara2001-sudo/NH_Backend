import { Op } from 'sequelize';
import { AppError } from '../../lib/AppError.js';
import { paginationMeta, toLimitOffset } from '../../lib/pagination.js';
import { Booking, BookingTraveller, Customer, Package, Payment } from '../../models/index.js';

/** Sequelize `where` for the admin booking filters (also used by the CSV export). */
export function bookingFilters({ status, paymentStatus, packageId, from, to, search }) {
  const where = {};
  if (status) where.status = status;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (packageId) where.packageId = packageId;
  if (from || to) {
    where.travelDate = { ...(from ? { [Op.gte]: from } : {}), ...(to ? { [Op.lte]: to } : {}) };
  }
  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [{ bookingNumber: like }, { leadName: like }, { leadEmail: like }, { leadPhone: like }];
  }
  return where;
}

/** GET /admin/bookings */
export async function listBookings(query) {
  const { rows, count } = await Booking.findAndCountAll({
    where: bookingFilters(query),
    order: [['createdAt', 'DESC']],
    ...toLimitOffset(query.page, query.pageSize),
  });
  return {
    data: rows.map((row) => row.get({ plain: true })),
    meta: paginationMeta(query.page, query.pageSize, count),
  };
}

/** GET /admin/bookings/:id — with customer, travellers and the payments timeline. */
export async function getBookingAdmin(id) {
  const booking = await Booking.findByPk(id, {
    include: [
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
      { model: Package, as: 'package', attributes: ['id', 'title', 'slug'] },
      { model: BookingTraveller, as: 'travellers', separate: true, order: [['id', 'ASC']] },
      { model: Payment, as: 'payments', separate: true, order: [['createdAt', 'ASC']] },
    ],
  });
  if (!booking) throw AppError.notFound('Booking not found.');
  return booking.get({ plain: true });
}
