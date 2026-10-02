// THE single place where booking money is calculated (CLAUDE.md section 2, "Money").
// Used by the quote endpoint and by booking creation so the numbers always match.
// Pure functions only: no database, no clock. All amounts are integer paise.

const PAISE_PER_RUPEE = 100;
const PERCENT = 100;

/** Rounds paise to the nearest whole rupee (a multiple of 100 paise). */
export function roundToRupee(paise) {
  return Math.round(paise / PAISE_PER_RUPEE) * PAISE_PER_RUPEE;
}

/** Selling unit price: the discounted price when set, otherwise the original price. */
export function sellingPrice(price) {
  return price.discountedPrice ?? price.originalPrice;
}

/**
 * Quantity (what is charged) and seats (travellers who take a seat) for a price option.
 * per_person: adults + children pay; per_couple / per_group: number of units.
 * Infants always travel free and never take a seat.
 */
export function travellerQuantities(price, { adults = 0, children = 0, infants = 0, units = 0 }) {
  if (price.priceType === 'per_person') {
    const quantity = adults + children;
    return { quantity, seats: quantity, adults, children, infants, units: 0 };
  }
  return { quantity: units, seats: units * price.personsCovered, adults: 0, children: 0, infants, units };
}

/**
 * Discount a coupon gives on a subtotal: percent (capped by maxDiscount) or flat,
 * never more than the subtotal. The coupon must already be validated.
 */
export function couponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  const raw =
    coupon.discountType === 'percent'
      ? Math.round((subtotal * coupon.discountValue) / PERCENT)
      : coupon.discountValue;
  const capped =
    coupon.discountType === 'percent' && coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, subtotal));
}

/**
 * Full price breakdown.
 * @param {object} input
 * @param {number} input.unitPrice            Selling unit price (paise)
 * @param {number} input.quantity             Charged quantity (persons or units)
 * @param {object|null} input.coupon          Validated coupon or null
 * @param {number} input.gstPercent           From site settings
 * @param {number} input.bookingAmountPercent Package override ?? site default (1–100)
 */
export function calculatePrice({ unitPrice, quantity, coupon = null, gstPercent, bookingAmountPercent }) {
  const subtotal = unitPrice * quantity;
  const discount = couponDiscount(coupon, subtotal);
  const taxable = subtotal - discount;
  const gstAmount = roundToRupee((taxable * gstPercent) / PERCENT);
  const total = taxable + gstAmount;
  const payNow = roundToRupee((total * bookingAmountPercent) / PERCENT);
  return {
    unitPrice,
    quantity,
    subtotal,
    discount,
    taxable,
    gstPercent,
    gstAmount,
    total,
    bookingAmountPercent,
    payNow,
    balanceDue: total - payNow,
  };
}

/**
 * Checks a coupon in the order CLAUDE.md defines and returns the first problem as a message,
 * or null when the coupon can be used.
 *
 * @param {object} coupon        Coupon row (or null when the code does not exist)
 * @param {object} context
 * @param {Date}   context.now
 * @param {number} context.packageId
 * @param {number[]} context.couponPackageIds  Packages the coupon is limited to
 * @param {string} context.priceType
 * @param {number} context.subtotal
 * @param {number} context.totalUses           Redemptions so far
 * @param {number|null} context.customerUses   Redemptions by this customer (null = not logged in)
 */
export function couponProblem(
  coupon,
  { now, packageId, couponPackageIds = [], priceType, subtotal, totalUses = 0, customerUses = null },
) {
  if (!coupon || !coupon.isActive) return 'This code is not valid.';
  if (coupon.validFrom && now < new Date(coupon.validFrom)) return `${coupon.code} is not active yet.`;
  if (coupon.validUntil && now > new Date(coupon.validUntil)) return `${coupon.code} has expired.`;
  if (!coupon.appliesToAllPackages && !couponPackageIds.includes(packageId)) {
    return `${coupon.code} is not valid on this package.`;
  }
  if (coupon.appliesToPriceType && coupon.appliesToPriceType !== priceType) {
    const label = { per_person: 'per person', per_couple: 'per couple', per_group: 'group' }[
      coupon.appliesToPriceType
    ];
    return `${coupon.code} is valid on the ${label} option only.`;
  }
  if (coupon.minOrderAmount != null && subtotal < coupon.minOrderAmount) {
    return `${coupon.code} needs a minimum booking of ₹${(coupon.minOrderAmount / PAISE_PER_RUPEE).toLocaleString('en-IN')}.`;
  }
  if (coupon.totalUsageLimit != null && totalUses >= coupon.totalUsageLimit)
    return `${coupon.code} has been fully used.`;
  if (coupon.perCustomerLimit != null && customerUses != null && customerUses >= coupon.perCustomerLimit) {
    return `You have already used ${coupon.code}.`;
  }
  return null;
}

/** Short success text, e.g. "NORTH10 applied: 10% off, up to ₹2,000." */
export function couponAppliedMessage(coupon) {
  const rupees = (paise) => `₹${(paise / PAISE_PER_RUPEE).toLocaleString('en-IN')}`;
  if (coupon.discountType === 'percent') {
    return `${coupon.code} applied: ${coupon.discountValue}% off${coupon.maxDiscount != null ? `, up to ${rupees(coupon.maxDiscount)}` : ''}.`;
  }
  return `${coupon.code} applied: ${rupees(coupon.discountValue)} off.`;
}
