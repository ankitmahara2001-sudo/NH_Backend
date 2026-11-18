import { describe, expect, it } from 'vitest';
import {
  calculatePrice,
  couponDiscount,
  couponProblem,
  roundToRupee,
  sellingPrice,
  travellerQuantities,
} from '../src/services/pricingService.js';

const NOW = new Date('2026-10-02T10:00:00+05:30');
const NORTH10 = {
  code: 'NORTH10',
  isActive: true,
  discountType: 'percent',
  discountValue: 10,
  maxDiscount: 200000,
  minOrderAmount: null,
  appliesToPriceType: null,
  appliesToAllPackages: true,
  validFrom: null,
  validUntil: '2026-12-31T23:59:59+05:30',
  totalUsageLimit: null,
  perCustomerLimit: 1,
};

describe('pricingService', () => {
  it('matches the worked example in CLAUDE.md', () => {
    // ₹12,999 × 2, NORTH10 (10%, max ₹2,000), GST 5%, booking 20%.
    const result = calculatePrice({
      unitPrice: 1299900,
      quantity: 2,
      coupon: NORTH10,
      gstPercent: 5,
      bookingAmountPercent: 20,
    });
    expect(result).toMatchObject({
      subtotal: 2599800,
      discount: 200000,
      gstAmount: 120000,
      total: 2519800,
      payNow: 504000,
      balanceDue: 2015800,
    });
  });

  it('rounds GST and the booking amount to whole rupees', () => {
    expect(roundToRupee(119990)).toBe(120000);
    expect(roundToRupee(503960)).toBe(504000);
    const result = calculatePrice({
      unitPrice: 799900,
      quantity: 1,
      gstPercent: 5,
      bookingAmountPercent: 20,
    });
    expect(result.gstAmount % 100).toBe(0);
    expect(result.payNow % 100).toBe(0);
    expect(result.total).toBe(799900 + 40000);
  });

  it('uses the discounted price when set', () => {
    expect(sellingPrice({ originalPrice: 1599900, discountedPrice: 1299900 })).toBe(1299900);
    expect(sellingPrice({ originalPrice: 1599900, discountedPrice: null })).toBe(1599900);
  });

  it('caps percent coupons, keeps flat coupons, never exceeds the subtotal', () => {
    expect(couponDiscount(NORTH10, 1000000)).toBe(100000);
    expect(couponDiscount(NORTH10, 5000000)).toBe(200000);
    const flat = { discountType: 'flat', discountValue: 150000 };
    expect(couponDiscount(flat, 3500000)).toBe(150000);
    expect(couponDiscount(flat, 100000)).toBe(100000);
    expect(couponDiscount(null, 100000)).toBe(0);
  });

  it('counts per-person travellers and makes infants free', () => {
    const perPerson = { priceType: 'per_person', personsCovered: 1 };
    expect(travellerQuantities(perPerson, { adults: 2, children: 1, infants: 2 })).toMatchObject({
      quantity: 3,
      seats: 3,
      infants: 2,
    });
  });

  it('counts couples and groups by units', () => {
    const couple = { priceType: 'per_couple', personsCovered: 2 };
    expect(travellerQuantities(couple, { units: 2, infants: 1, adults: 9 })).toMatchObject({
      quantity: 2,
      seats: 4,
      adults: 0,
    });
    const group = { priceType: 'per_group', personsCovered: 4 };
    expect(travellerQuantities(group, { units: 1 })).toMatchObject({ quantity: 1, seats: 4 });
  });

  it('supports a package booking % override and 100% (no balance)', () => {
    const override = calculatePrice({
      unitPrice: 3499900,
      quantity: 1,
      gstPercent: 5,
      bookingAmountPercent: 25,
    });
    expect(override.payNow).toBe(roundToRupee(override.total * 0.25));
    const full = calculatePrice({
      unitPrice: 1000000,
      quantity: 1,
      gstPercent: 5,
      bookingAmountPercent: 100,
    });
    expect(full.payNow).toBe(full.total);
    expect(full.balanceDue).toBe(0);
  });

  it('takes a manual (admin) discount off after the coupon and before GST, capped at the price', () => {
    // ₹12,999 × 2 − NORTH10 ₹2,000 − manual ₹1,000 = ₹22,998 taxable; GST 5% = ₹1,150 (rounded).
    const result = calculatePrice({
      unitPrice: 1299900,
      quantity: 2,
      coupon: NORTH10,
      gstPercent: 5,
      bookingAmountPercent: 20,
      manualDiscount: 100000,
    });
    expect(result).toMatchObject({
      discount: 200000,
      manualDiscount: 100000,
      taxable: 2299800,
      gstAmount: 115000,
      total: 2414800,
    });
    const capped = calculatePrice({
      unitPrice: 500000,
      quantity: 1,
      gstPercent: 5,
      bookingAmountPercent: 20,
      manualDiscount: 900000,
    });
    expect(capped).toMatchObject({ manualDiscount: 500000, taxable: 0, total: 0 });
    expect(calculatePrice({ unitPrice: 100, quantity: 1, gstPercent: 5, bookingAmountPercent: 20 }))
      .toHaveProperty('manualDiscount', 0);
  });

  describe('couponProblem (validation order)', () => {
    const base = {
      now: NOW,
      packageId: 1,
      couponPackageIds: [],
      priceType: 'per_person',
      subtotal: 2599800,
      totalUses: 0,
      customerUses: 0,
    };

    it('accepts a valid coupon', () => {
      expect(couponProblem(NORTH10, base)).toBeNull();
    });

    it('rejects unknown and inactive coupons', () => {
      expect(couponProblem(null, base)).toBe('This code is not valid.');
      expect(couponProblem({ ...NORTH10, isActive: false }, base)).toBe('This code is not valid.');
    });

    it('rejects expired and not-yet-active coupons', () => {
      expect(couponProblem({ ...NORTH10, validUntil: '2026-01-01T00:00:00Z' }, base)).toMatch(/expired/);
      expect(couponProblem({ ...NORTH10, validFrom: '2027-01-01T00:00:00Z' }, base)).toMatch(
        /not active yet/,
      );
    });

    it('checks package and price-type restrictions', () => {
      const limited = { ...NORTH10, appliesToAllPackages: false };
      expect(couponProblem(limited, { ...base, couponPackageIds: [2] })).toMatch(/not valid on this package/);
      expect(couponProblem(limited, { ...base, couponPackageIds: [1] })).toBeNull();
      const coupleOnly = { ...NORTH10, code: 'COUPLE2000', appliesToPriceType: 'per_couple' };
      expect(couponProblem(coupleOnly, base)).toBe('COUPLE2000 is valid on the per couple option only.');
    });

    it('checks the minimum order on the subtotal', () => {
      const min = { ...NORTH10, code: 'CHARDHAM1500', minOrderAmount: 3000000 };
      expect(couponProblem(min, base)).toBe('CHARDHAM1500 needs a minimum booking of ₹30,000.');
      expect(couponProblem(min, { ...base, subtotal: 3000000 })).toBeNull();
    });

    it('checks total and per-customer usage limits', () => {
      expect(couponProblem({ ...NORTH10, totalUsageLimit: 5 }, { ...base, totalUses: 5 })).toMatch(
        /fully used/,
      );
      expect(couponProblem(NORTH10, { ...base, customerUses: 1 })).toBe('You have already used NORTH10.');
      // Not logged in: the per-customer limit is checked again at booking time.
      expect(couponProblem(NORTH10, { ...base, customerUses: null })).toBeNull();
    });

    it('reports the first failing rule only', () => {
      const many = { ...NORTH10, appliesToAllPackages: false, minOrderAmount: 99999999 };
      expect(couponProblem(many, base)).toMatch(/not valid on this package/);
    });
  });
});
