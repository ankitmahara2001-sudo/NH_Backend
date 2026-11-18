import { Op, QueryTypes } from 'sequelize';
import { EXPIRED_REASON } from '../../jobs/expirePendingBookings.js';
import { addDays, todayIst } from '../../lib/dates.js';
import { sequelize } from '../../lib/db.js';
import { Booking, Enquiry, Package, PackageDeparture } from '../../models/index.js';

// GET /admin/dashboard — figures for a period (IST calendar dates, default: this month so far),
// optionally for one package and/or one booking source (website or admin panel).

const UPCOMING_DAYS = 45;
const LATEST_BOOKINGS = 8;

/** The period as IST dates plus the [start, end) instants to compare timestamps with. */
function period({ from, to }) {
  const today = todayIst();
  const start = from ?? `${today.slice(0, 7)}-01`;
  const end = to ?? today;
  return {
    from: start,
    to: end,
    startsAt: new Date(`${start}T00:00:00+05:30`),
    endsBefore: new Date(`${addDays(end, 1)}T00:00:00+05:30`),
  };
}

/** Money received and refunded in the period, split by online (Razorpay) and offline methods. */
async function moneyInPeriod({ startsAt, endsBefore }, { packageId, source }) {
  const conditions = ['p.paid_at >= :startsAt', 'p.paid_at < :endsBefore'];
  if (packageId) conditions.push('b.package_id = :packageId');
  if (source) conditions.push('b.source = :source');
  const [row] = await sequelize.query(
    `SELECT
       COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type <> 'refund' AND p.status IN ('captured', 'recorded') AND p.method = 'razorpay'), 0) AS online,
       COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type <> 'refund' AND p.status IN ('captured', 'recorded') AND p.method <> 'razorpay'), 0) AS offline,
       COALESCE(SUM(p.amount) FILTER (WHERE p.payment_type = 'refund'), 0) AS refunded
     FROM payments p
     JOIN bookings b ON b.id = p.booking_id
     WHERE ${conditions.join(' AND ')}`,
    {
      type: QueryTypes.SELECT,
      replacements: { startsAt, endsBefore, packageId: packageId ?? null, source: source ?? null },
    },
  );
  const online = Number(row.online);
  const offline = Number(row.offline);
  const refunded = Number(row.refunded);
  return { online, offline, refunded, net: online + offline - refunded };
}

/** GET /admin/dashboard */
export async function getDashboard(query = {}) {
  const range = period(query);
  const today = todayIst();
  const filters = {
    ...(query.packageId ? { packageId: query.packageId } : {}),
    ...(query.source ? { source: query.source } : {}),
  };
  const createdInPeriod = { createdAt: { [Op.gte]: range.startsAt, [Op.lt]: range.endsBefore } };
  const booked = { ...filters, ...createdInPeriod, status: { [Op.in]: ['confirmed', 'completed'] } };

  const [
    bookings,
    travellers,
    bookedValue,
    bySource,
    money,
    cancellations,
    balancePending,
    newEnquiries,
    departures,
    latest,
  ] = await Promise.all([
    Booking.count({ where: booked }),
    Booking.sum('seats', { where: booked }),
    Booking.sum('totalAmount', { where: booked }),
    Booking.count({ where: booked, group: ['source'] }),
    moneyInPeriod(range, query),
    // Real cancellations only: unpaid website bookings that simply expired are left out.
    Booking.count({
      where: {
        ...filters,
        status: 'cancelled',
        cancelledAt: { [Op.gte]: range.startsAt, [Op.lt]: range.endsBefore },
        [Op.or]: [{ cancelReason: null }, { cancelReason: { [Op.ne]: EXPIRED_REASON } }],
      },
    }),
    // Still to collect on every confirmed booking, whatever the period.
    Booking.sum('balanceDue', { where: { ...filters, status: 'confirmed' } }),
    Enquiry.count({ where: { status: 'new' } }),
    PackageDeparture.findAll({
      where: {
        isActive: true,
        startDate: { [Op.between]: [today, addDays(today, UPCOMING_DAYS)] },
        ...(query.packageId ? { packageId: query.packageId } : {}),
      },
      include: [{ model: Package, as: 'package', attributes: ['id', 'title'], where: { isActive: true } }],
      order: [['startDate', 'ASC']],
    }),
    Booking.findAll({
      where: { ...filters, ...createdInPeriod, status: { [Op.ne]: 'pending' } },
      order: [['createdAt', 'DESC']],
      limit: LATEST_BOOKINGS,
      attributes: [
        'id',
        'bookingNumber',
        'packageTitle',
        'leadName',
        'travelDate',
        'source',
        'status',
        'paymentStatus',
        'totalAmount',
        'createdAt',
      ],
    }),
  ]);

  const sourceCount = (source) => Number(bySource.find((row) => row.source === source)?.count ?? 0);

  return {
    period: { from: range.from, to: range.to },
    bookings,
    bookingsBySource: { website: sourceCount('website'), admin: sourceCount('admin') },
    travellers: travellers ?? 0,
    bookedValue: bookedValue ?? 0,
    collected: money,
    cancellations,
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
