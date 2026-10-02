'use strict';
const coupons = require('../db/seed-data/coupons.cjs');
const { rupees, withTimestamps, endOfDayIst } = require('../db/seed-data/helpers.cjs');

/** The six coupons shown on the Offers page. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      const [packageRows] = await queryInterface.sequelize.query('SELECT id, slug FROM packages', options);
      const packageIds = Object.fromEntries(packageRows.map((row) => [row.slug, row.id]));
      const validFrom = new Date();

      for (const coupon of coupons) {
        const discountValue =
          coupon.discount_type === 'percent' ? coupon.discount_percent : rupees(coupon.discount_rupees);

        await queryInterface.bulkInsert(
          'coupons',
          withTimestamps([
            {
              code: coupon.code,
              description: coupon.description,
              discount_type: coupon.discount_type,
              discount_value: discountValue,
              max_discount: coupon.max_discount_rupees == null ? null : rupees(coupon.max_discount_rupees),
              min_order_amount: coupon.min_order_rupees == null ? null : rupees(coupon.min_order_rupees),
              applies_to_price_type: coupon.applies_to_price_type,
              applies_to_all_packages: coupon.packages == null,
              valid_from: validFrom,
              valid_until: endOfDayIst(coupon.valid_until),
              total_usage_limit: coupon.total_usage_limit,
              per_customer_limit: coupon.per_customer_limit,
              show_on_site: true,
              is_active: true,
            },
          ]),
          options,
        );

        if (coupon.packages) {
          const [[{ id: couponId }]] = await queryInterface.sequelize.query(
            'SELECT id FROM coupons WHERE code = :code',
            { ...options, replacements: { code: coupon.code } },
          );
          const rows = coupon.packages.map((slug) => {
            if (!packageIds[slug]) throw new Error(`Unknown package "${slug}" for coupon ${coupon.code}`);
            return { coupon_id: couponId, package_id: packageIds[slug] };
          });
          await queryInterface.bulkInsert('coupon_packages', withTimestamps(rows), options);
        }
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('coupon_packages', null, { transaction });
      await queryInterface.bulkDelete('coupons', null, { transaction });
    });
  },
};
