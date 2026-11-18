import { Op } from 'sequelize';
import { AppError } from '../lib/AppError.js';
import { addDays, todayIst } from '../lib/dates.js';
import { PackageBlockedDate, PackageDeparture } from '../models/index.js';

// Which dates a package can be booked on (CLAUDE.md section 2, "Availability type").

const fieldError = (field, message) => AppError.badRequest(message, { [field]: message });

/**
 * Validates the chosen date for a package and returns { travelDate, endDate, departure }.
 * all_season: travelDate ≥ today + minDaysBeforeBooking and outside blocked ranges.
 * fixed_date: an active, future departure of this package with enough seats left.
 * Pass `lock` (with a transaction) when reserving seats, so concurrent bookings queue up.
 * `ignoreLeadTime` (admin-panel bookings) allows any all_season date from today, skipping
 * minDaysBeforeBooking; blocked dates still apply.
 */
export async function resolveTravelDate(
  pkg,
  { travelDate, departureId, seats },
  { transaction, lock = false, ignoreLeadTime = false } = {},
) {
  const today = todayIst();

  if (pkg.availabilityType === 'fixed_date') {
    if (!departureId) throw fieldError('departureId', 'Choose a departure date.');
    const departure = await PackageDeparture.findOne({
      where: { id: departureId, packageId: pkg.id },
      transaction,
      lock: lock && transaction ? transaction.LOCK.UPDATE : undefined,
    });
    if (!departure || !departure.isActive || departure.startDate < today) {
      throw fieldError('departureId', 'This departure is no longer available. Please choose another date.');
    }
    if (departure.totalSeats != null) {
      const seatsLeft = departure.totalSeats - departure.bookedSeats;
      if (seatsLeft <= 0)
        throw fieldError('departureId', 'This departure is sold out. Please choose another date.');
      if (seats > seatsLeft) {
        throw fieldError(
          'departureId',
          `Only ${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left on this departure.`,
        );
      }
    }
    return {
      travelDate: departure.startDate,
      endDate: addDays(departure.startDate, pkg.durationNights),
      departure,
    };
  }

  if (!travelDate) throw fieldError('travelDate', 'Choose a travel date.');
  const earliest = addDays(today, pkg.minDaysBeforeBooking);
  if (ignoreLeadTime) {
    if (travelDate < today) throw fieldError('travelDate', 'Choose today or a later date.');
  } else if (travelDate < earliest) {
    throw fieldError(
      'travelDate',
      `Bookings open from ${pkg.minDaysBeforeBooking} days ahead. Choose a date from ${earliest}.`,
    );
  }
  const blocked = await PackageBlockedDate.findOne({
    where: { packageId: pkg.id, startDate: { [Op.lte]: travelDate }, endDate: { [Op.gte]: travelDate } },
    transaction,
  });
  if (blocked) {
    throw fieldError(
      'travelDate',
      `This trip does not run on that date${blocked.reason ? ` (${blocked.reason.toLowerCase()})` : ''}. Choose another date.`,
    );
  }
  return { travelDate, endDate: addDays(travelDate, pkg.durationNights), departure: null };
}
