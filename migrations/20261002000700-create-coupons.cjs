'use strict';
const {
  timestamps,
  idColumn,
  foreignKey,
  money,
  dropTableWithEnums,
  addIndexes,
} = require('../db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'coupons',
        {
          id: idColumn(Sequelize),
          // Always stored uppercase.
          code: { type: Sequelize.STRING(40), allowNull: false, unique: true },
          description: { type: Sequelize.STRING(255), allowNull: false },
          discount_type: { type: Sequelize.ENUM('percent', 'flat'), allowNull: false },
          // percent: whole number (10 = 10%); flat: paise.
          discount_value: { type: Sequelize.INTEGER, allowNull: false },
          max_discount: money(Sequelize, { allowNull: true }),
          min_order_amount: money(Sequelize, { allowNull: true }),
          // NULL = any price type.
          applies_to_price_type: {
            type: Sequelize.ENUM('per_person', 'per_couple', 'per_group'),
            allowNull: true,
          },
          applies_to_all_packages: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          valid_from: { type: Sequelize.DATE, allowNull: true },
          valid_until: { type: Sequelize.DATE, allowNull: true },
          total_usage_limit: { type: Sequelize.INTEGER, allowNull: true },
          per_customer_limit: { type: Sequelize.INTEGER, allowNull: true },
          show_on_site: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'coupons', [['is_active', 'show_on_site'], 'valid_until'], options);

      await queryInterface.createTable(
        'coupon_packages',
        {
          coupon_id: { ...foreignKey(Sequelize, 'coupons'), primaryKey: true },
          package_id: { ...foreignKey(Sequelize, 'packages'), primaryKey: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      // The composite primary key covers coupon_id lookups; package_id needs its own index.
      await addIndexes(queryInterface, 'coupon_packages', ['package_id'], options);
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('coupon_packages');
    await dropTableWithEnums(queryInterface, 'coupons', ['discount_type', 'applies_to_price_type']);
  },
};
