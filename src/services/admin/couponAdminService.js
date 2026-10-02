import { AppError } from '../../lib/AppError.js';
import { sequelize } from '../../lib/db.js';
import { Coupon, Package } from '../../models/index.js';

const USAGE_COUNT = [
  sequelize.literal(`(SELECT COUNT(*)::int FROM coupon_redemptions cr WHERE cr.coupon_id = "Coupon"."id")`),
  'usageCount',
];

const INCLUDE_PACKAGES = {
  model: Package,
  as: 'packages',
  attributes: ['id', 'title', 'slug'],
  through: { attributes: [] },
};

function serializeCoupon(coupon) {
  const plain = coupon.get({ plain: true });
  return {
    ...plain,
    usageCount: Number(plain.usageCount ?? 0),
    packageIds: (plain.packages ?? []).map((p) => p.id),
  };
}

async function findOrFail(id) {
  const coupon = await Coupon.findByPk(id, {
    attributes: { include: [USAGE_COUNT] },
    include: [INCLUDE_PACKAGES],
  });
  if (!coupon) throw AppError.notFound('Coupon not found.');
  return coupon;
}

export async function listCoupons() {
  const rows = await Coupon.findAll({
    attributes: { include: [USAGE_COUNT] },
    include: [INCLUDE_PACKAGES],
    order: [['createdAt', 'DESC']],
  });
  return rows.map(serializeCoupon);
}

export async function getCoupon(id) {
  return serializeCoupon(await findOrFail(id));
}

async function save(coupon, { packageIds, ...input }) {
  await sequelize.transaction(async (transaction) => {
    if (coupon) await coupon.update(input, { transaction });
    else coupon = await Coupon.create(input, { transaction });
    await coupon.setPackages(input.appliesToAllPackages ? [] : packageIds, { transaction });
  });
  return getCoupon(coupon.id);
}

export const createCoupon = (input) => save(null, input);

export async function updateCoupon(id, input) {
  return save(await findOrFail(id), input);
}

/** Coupons that were already redeemed are kept for the records; deactivate those instead. */
export async function deleteCoupon(id) {
  const coupon = await findOrFail(id);
  if (Number(coupon.get('usageCount')) > 0) {
    throw AppError.conflict('This coupon has been used in bookings. Deactivate it instead of deleting it.');
  }
  await coupon.destroy();
}
