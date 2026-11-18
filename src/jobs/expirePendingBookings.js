import cron from 'node-cron';
import { Op } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { Booking, PackageDeparture, Payment } from '../models/index.js';

// CLAUDE.md "Booking and payment flow", step 7: pending bookings whose 30-minute hold has run
// out are cancelled and their reserved seats go back to the departure.

const EVERY_FIVE_MINUTES = '*/5 * * * *';
/** Also used by the dashboard to tell automatic expiries from real cancellations. */
export const EXPIRED_REASON = 'Payment not completed in time';

/** Cancels one booking if it is still pending; the row lock stops a racing payment capture. */
async function expireBooking(bookingId, now) {
  await sequelize.transaction(async (transaction) => {
    const lock = transaction.LOCK.UPDATE;
    const booking = await Booking.findByPk(bookingId, { transaction, lock });
    if (!booking || booking.status !== 'pending') return;

    if (booking.departureId) {
      const departure = await PackageDeparture.findByPk(booking.departureId, { transaction, lock });
      if (departure) {
        await departure.update(
          { bookedSeats: Math.max(0, departure.bookedSeats - booking.seats) },
          { transaction },
        );
      }
    }
    await booking.update(
      { status: 'cancelled', cancelledAt: now, cancelReason: EXPIRED_REASON, expiresAt: null },
      { transaction },
    );
    await Payment.update(
      { status: 'failed', failureReason: EXPIRED_REASON },
      { where: { bookingId, status: 'created' }, transaction },
    );
  });
}

/** @returns {Promise<number>} how many bookings were cancelled */
export async function expirePendingBookings(now = new Date()) {
  const expired = await Booking.findAll({
    where: { status: 'pending', expiresAt: { [Op.lt]: now } },
    attributes: ['id'],
  });
  for (const { id } of expired) await expireBooking(id, now);
  if (expired.length) logger.info({ count: expired.length }, 'Expired pending bookings cancelled');
  return expired.length;
}

/** Started by server.js (not in tests). */
export function scheduleExpirePendingBookings() {
  return cron.schedule(EVERY_FIVE_MINUTES, () => {
    expirePendingBookings().catch((error) => logger.error({ err: error }, 'Expiring pending bookings failed'));
  });
}
