import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { couponSchema, packagePricesSchema, settingSchemas } from '@nh/shared';

// Seed data must always satisfy the same schemas the admin panel and API use.
const require = createRequire(import.meta.url);
const settings = require('../db/seed-data/settings.cjs');
const packages = require('../db/seed-data/packages.cjs');

const coupons = require('../db/seed-data/coupons.cjs');

const RUPEE = 100;

describe('seed data', () => {
  it('has a valid value for every site setting key', () => {
    for (const key of Object.keys(settingSchemas)) {
      const result = settingSchemas[key].safeParse(settings[key]);
      expect(result.success, `${key}: ${result.error?.message}`).toBe(true);
    }
  });

  it('seeds 9 packages with valid prices and a full itinerary', () => {
    expect(packages).toHaveLength(9);
    for (const pkg of packages) {
      const prices = pkg.prices.map((p) => ({
        label: p.label,
        priceType: p.price_type,
        personsCovered: p.persons_covered,
        originalPrice: p.original * RUPEE,
        discountedPrice: p.discounted == null ? null : p.discounted * RUPEE,
        isDefault: Boolean(p.is_default),
      }));
      expect(packagePricesSchema.safeParse({ prices }).success, pkg.slug).toBe(true);
      expect(
        prices.filter((p) => p.isDefault),
        pkg.slug,
      ).toHaveLength(1);
      expect(pkg.itinerary, pkg.slug).toHaveLength(pkg.duration_days);
      expect(pkg.duration_nights, pkg.slug).toBe(pkg.duration_days - 1);
    }
  });

  it('gives fixed-date packages departures, including a nearly sold-out one', () => {
    const fixed = packages.filter((p) => p.availability_type === 'fixed_date');
    expect(fixed.length).toBeGreaterThanOrEqual(2);
    for (const pkg of fixed) expect(pkg.departures?.length, pkg.slug).toBeGreaterThan(0);

    const nearlySoldOut = fixed
      .flatMap((p) => p.departures ?? [])
      .some((d) => d.total_seats != null && d.total_seats - d.booked_seats <= 2);
    expect(nearlySoldOut).toBe(true);
  });

  it('seeds the six coupons named in CLAUDE.md', () => {
    expect(coupons.map((c) => c.code).sort()).toEqual(
      ['CHARDHAM1500', 'COUPLE2000', 'EARLYTREK15', 'FAMILY3000', 'NORTH10', 'WEEKEND750'].sort(),
    );
    for (const c of coupons) {
      const parsed = couponSchema.safeParse({
        code: c.code,
        description: c.description,
        discountType: c.discount_type,
        discountValue: c.discount_type === 'percent' ? c.discount_percent : c.discount_rupees * RUPEE,
        appliesToAllPackages: c.packages == null,
        packageIds: Array.isArray(c.packages) ? c.packages.map((_slug, i) => i + 1) : [],
      });
      expect(parsed.success, String(c.code)).toBe(true);
    }
  });
});
