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
        'payments',
        {
          id: idColumn(Sequelize),
          booking_id: foreignKey(Sequelize, 'bookings', { onDelete: 'RESTRICT' }),
          payment_type: { type: Sequelize.ENUM('advance', 'balance', 'refund'), allowNull: false },
          method: {
            type: Sequelize.ENUM('razorpay', 'cash', 'upi', 'bank_transfer', 'other'),
            allowNull: false,
          },
          amount: money(Sequelize),
          status: {
            type: Sequelize.ENUM('created', 'captured', 'failed', 'recorded', 'refunded'),
            allowNull: false,
          },
          // Postgres allows many NULLs in a unique column, so offline payments are fine.
          razorpay_order_id: { type: Sequelize.STRING(64), allowNull: true, unique: true },
          razorpay_payment_id: { type: Sequelize.STRING(64), allowNull: true, unique: true },
          reference: { type: Sequelize.STRING(120), allowNull: true },
          notes: { type: Sequelize.TEXT, allowNull: true },
          failure_reason: { type: Sequelize.TEXT, allowNull: true },
          raw_payload: { type: Sequelize.JSONB, allowNull: true },
          paid_at: { type: Sequelize.DATE, allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'payments', ['booking_id', ['status', 'paid_at']], options);

      await queryInterface.createTable(
        'coupon_redemptions',
        {
          id: idColumn(Sequelize),
          coupon_id: foreignKey(Sequelize, 'coupons', { onDelete: 'RESTRICT' }),
          // One coupon per booking.
          booking_id: { ...foreignKey(Sequelize, 'bookings', { onDelete: 'RESTRICT' }), unique: true },
          customer_id: foreignKey(Sequelize, 'customers', { onDelete: 'RESTRICT' }),
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(
        queryInterface,
        'coupon_redemptions',
        [['coupon_id', 'customer_id'], 'customer_id'],
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('coupon_redemptions');
    await dropTableWithEnums(queryInterface, 'payments', ['payment_type', 'method', 'status']);
  },
};
