import { Op } from 'sequelize';
import { addDays, todayIst } from '../../lib/dates.js';
import { Booking, Enquiry, Package, PackageDeparture, Payment } from '../../models/index.js';

const UPCOMING_DAYS = 45;
const LATEST_BOOKINGS = 8;
const PAID_STATUSES = ['captured', 'recorded'];

/** Start of today and of this month in India time, as Date objects. */
function istPeriodStarts() {
  const today = todayIst();
  return {
    today: new Date(`${today}T00:00:00+05:30`),
    month: new Date(`${today.slice(0, 7)}-01T00:00:00+05:30`),
  };
}

/** GET /admin/dashboard */
export async function getDashboard() {
  const starts = istPeriodStarts();
  const today = todayIst();
  const notPending = { status: { [Op.in]: ['confirmed', 'completed'] } };

  const [
    bookingsToday,
    bookingsThisMonth,
    collected,
    refunded,
    balancePending,
    newEnquiries,
    departures,
    latest,
  ] = await Promise.all([
    Booking.count({ where: { ...notPending, createdAt: { [Op.gte]: starts.today } } }),
    Booking.count({ where: { ...notPending, createdAt: { [Op.gte]: starts.month } } }),
    Payment.sum('amount', {
      where: {
        paymentType: { [Op.ne]: 'refund' },
        status: { [Op.in]: PAID_STATUSES },
        paidAt: { [Op.gte]: starts.month },
      },
    }),
    Payment.sum('amount', { where: { paymentType: 'refund', paidAt: { [Op.gte]: starts.month } } }),
    Booking.sum('balanceDue', { where: { status: 'confirmed' } }),
    Enquiry.count({ where: { status: 'new' } }),
    PackageDeparture.findAll({
      where: { isActive: true, startDate: { [Op.between]: [today, addDays(today, UPCOMING_DAYS)] } },
      include: [{ model: Package, as: 'package', attributes: ['id', 'title'], where: { isActive: true } }],
      order: [['startDate', 'ASC']],
    }),
    Booking.findAll({
      order: [['createdAt', 'DESC']],
      limit: LATEST_BOOKINGS,
      attributes: [
        'id',
        'bookingNumber',
        'packageTitle',
        'leadName',
        'travelDate',
        'status',
        'paymentStatus',
        'totalAmount',
        'createdAt',
      ],
    }),
  ]);

  return {
    bookingsToday,
    bookingsThisMonth,
    revenueThisMonth: (collected ?? 0) - (refunded ?? 0),
    balancePending: balancePending ?? 0,
    newEnquiries,
    upcomingDepartures: departures.map((d) => ({
      id: d.id,
      packageId: d.package.id,
      packageTitle: d.package.title,
      startDate: d.startDate,
      totalSeats: d.totalSeats,
      bookedSeats: d.bookedSeats,
      seatsLeft: d.totalSeats == null ? null : Math.max(0, d.totalSeats - d.bookedSeats),
    })),
    latestBookings: latest.map((b) => b.get({ plain: true })),
  };
}
