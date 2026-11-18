import { formatRupees } from '../domain/format.js';
import { AppError } from '../lib/AppError.js';
import { Coupon, CouponRedemption, Package, PackagePrice } from '../models/index.js';
import { resolveTravelDate } from './availabilityService.js';
import {
  calculatePrice,
  couponAppliedMessage,
  couponProblem,
  sellingPrice,
  travellerQuantities,
} from './pricingService.js';
import { getPricingSettings } from './settingsService.js';

// Builds a full price quote for a package choice. Used by POST /pricing/quote and by booking
// creation (strict mode), so the website and the stored booking always show the same numbers.

const fieldError = (field, message) => AppError.badRequest(message, { [field]: message });

async function loadPackageAndPrice(packageId, priceId, transaction) {
  const pkg = await Package.findOne({ where: { id: packageId, isActive: true }, transaction });
  if (!pkg) throw AppError.notFound('This package is no longer available.');
  const price = await PackagePrice.findOne({ where: { id: priceId, packageId }, transaction });
  if (!price) throw fieldError('priceId', 'Choose one of the package options.');
  return { pkg, price };
}

function validateCounts(pkg, price, counts) {
  const q = travellerQuantities(price, counts);
  if (price.priceType === 'per_person' && q.adults < 1)
    throw fieldError('counts.adults', 'Add at least one adult.');
  if (price.priceType !== 'per_person' && q.units < 1) {
    throw fieldError(
      'counts.units',
      `Add at least one ${price.priceType === 'per_couple' ? 'couple' : 'group'}.`,
    );
  }
  if (pkg.groupSizeMax && q.seats > pkg.groupSizeMax) {
    throw fieldError('counts', `This trip takes up to ${pkg.groupSizeMax} travellers per booking.`);
  }
  return q;
}

/** Validates the code and returns { coupon, problem }. */
async function evaluateCoupon(code, { pkg, price, subtotal, customerId, now, transaction }) {
  if (!code) return { coupon: null, problem: null };
  const coupon = await Coupon.findOne({ where: { code }, include: ['packages'], transaction });
  const [totalUses, customerUses] = coupon
    ? await Promise.all([
        CouponRedemption.count({ where: { couponId: coupon.id }, transaction }),
        customerId
          ? CouponRedemption.count({ where: { couponId: coupon.id, customerId }, transaction })
          : null,
      ])
    : [0, null];
  const problem = couponProblem(coupon, {
    now,
    packageId: pkg.id,
    couponPackageIds: coupon?.packages?.map((p) => p.id) ?? [],
    priceType: price.priceType,
    subtotal,
    totalUses,
    customerUses,
  });
  return { coupon: problem ? null : coupon, problem };
}

/**
 * @param {object} input  pricingQuoteSchema output (packageId, priceId, counts, travelDate?, departureId?, couponCode?)
 * @param {object} [options]
 * @param {number|null} [options.customerId]  For the per-customer coupon limit
 * @param {boolean} [options.strict]          Booking creation: an invalid coupon is an error
 * @param {object} [options.transaction]      Booking creation: lock the departure row
 * @param {boolean} [options.admin]           Admin panel: allows input.manualDiscount and short-notice dates
 */
export async function buildQuote(
  input,
  { customerId = null, strict = false, transaction, now = new Date(), admin = false } = {},
) {
  const { pkg, price } = await loadPackageAndPrice(input.packageId, input.priceId, transaction);
  const quantities = validateCounts(pkg, price, input.counts);
  const dates = await resolveTravelDate(
    pkg,
    { ...input, seats: quantities.seats },
    { transaction, lock: Boolean(transaction), admin },
  );

  const unitPrice = sellingPrice(price);
  const subtotal = unitPrice * quantities.quantity;
  const { coupon, problem } = await evaluateCoupon(input.couponCode, {
    pkg,
    price,
    subtotal,
    customerId,
    now,
    transaction,
  });
  if (problem && strict) throw fieldError('couponCode', problem);

  const settings = await getPricingSettings({ transaction });
  const breakdown = calculatePrice({
    unitPrice,
    quantity: quantities.quantity,
    coupon,
    gstPercent: settings.gstPercent,
    bookingAmountPercent: pkg.bookingAmountPercent ?? settings.defaultBookingPercent,
    manualDiscount: admin ? (input.manualDiscount ?? 0) : 0,
  });
  if (admin && input.manualDiscount > breakdown.manualDiscount) {
    const max = breakdown.subtotal - breakdown.discount;
    throw fieldError(
      'manualDiscount',
      `The discount cannot be more than ${formatRupees(max)} (the price after any coupon, before GST).`,
    );
  }

  return {
    package: pkg,
    price,
    coupon,
    quantities,
    dates,
    breakdown,
    couponResult: input.couponCode
      ? {
          code: input.couponCode,
          valid: Boolean(coupon),
          message: coupon ? couponAppliedMessage(coupon) : problem,
        }
      : null,
  };
}

/** The public JSON shape of a quote. */
export function serializeQuote(quote) {
  return {
    packageId: quote.package.id,
    priceId: quote.price.id,
    priceLabel: quote.price.label,
    priceType: quote.price.priceType,
    personsCovered: quote.price.personsCovered,
    travelDate: quote.dates.travelDate,
    endDate: quote.dates.endDate,
    departureId: quote.dates.departure?.id ?? null,
    ...quote.quantities,
    coupon: quote.couponResult,
    ...quote.breakdown,
  };
}
