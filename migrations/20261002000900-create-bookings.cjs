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
      const count = () => ({ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });

      await queryInterface.createTable(
        'bookings',
        {
          id: idColumn(Sequelize),
          // NH-<year>-<5-digit sequence>
          booking_number: { type: Sequelize.STRING(20), allowNull: false, unique: true },
          customer_id: foreignKey(Sequelize, 'customers', { onDelete: 'RESTRICT' }),
          package_id: foreignKey(Sequelize, 'packages', { onDelete: 'RESTRICT' }),
          // The price snapshot below keeps the booking readable if a price option is later removed.
          package_price_id: foreignKey(Sequelize, 'package_prices', {
            allowNull: true,
            onDelete: 'SET NULL',
          }),
          departure_id: foreignKey(Sequelize, 'package_departures', {
            allowNull: true,
            onDelete: 'RESTRICT',
          }),
          travel_date: { type: Sequelize.DATEONLY, allowNull: false },
          end_date: { type: Sequelize.DATEONLY, allowNull: false },
          pickup_point: { type: Sequelize.STRING(160), allowNull: true },
          adults: count(),
          children: count(),
          infants: count(),
          units: count(),
          seats: count(),
          lead_name: { type: Sequelize.STRING(120), allowNull: false },
          lead_email: { type: Sequelize.STRING(255), allowNull: false },
          lead_phone: { type: Sequelize.STRING(20), allowNull: false },
          special_requests: { type: Sequelize.TEXT, allowNull: true },
          status: {
            type: Sequelize.ENUM('pending', 'confirmed', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
          },
          payment_status: {
            type: Sequelize.ENUM('unpaid', 'advance_paid', 'fully_paid', 'refunded'),
            allowNull: false,
            defaultValue: 'unpaid',
          },
          // ---- Price snapshot (all money in paise) ----
          package_title: { type: Sequelize.STRING(160), allowNull: false },
          price_label: { type: Sequelize.STRING(120), allowNull: false },
          price_type: { type: Sequelize.ENUM('per_person', 'per_couple', 'per_group'), allowNull: false },
          unit_price: money(Sequelize),
          quantity: { type: Sequelize.INTEGER, allowNull: false },
          subtotal: money(Sequelize),
          coupon_code: { type: Sequelize.STRING(40), allowNull: true },
          discount_amount: money(Sequelize, { defaultValue: 0 }),
          gst_percent: { type: Sequelize.INTEGER, allowNull: false },
          gst_amount: money(Sequelize),
          total_amount: money(Sequelize),
          booking_amount_percent: { type: Sequelize.INTEGER, allowNull: false },
          pay_now_amount: money(Sequelize),
          amount_paid: money(Sequelize, { defaultValue: 0 }),
          balance_due: money(Sequelize),
          refunded_amount: money(Sequelize, { defaultValue: 0 }),
          cancelled_at: { type: Sequelize.DATE, allowNull: true },
          cancel_reason: { type: Sequelize.TEXT, allowNull: true },
          // Pending bookings past this time are cancelled by the cleanup job.
          expires_at: { type: Sequelize.DATE, allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(
        queryInterface,
        'bookings',
        [
          'customer_id',
          'package_id',
          'package_price_id',
          'departure_id',
          'travel_date',
          'payment_status',
          'created_at',
          ['status', 'expires_at'],
        ],
        options,
      );

      await queryInterface.createTable(
        'booking_travellers',
        {
          id: idColumn(Sequelize),
          booking_id: foreignKey(Sequelize, 'bookings'),
          full_name: { type: Sequelize.STRING(120), allowNull: false },
          age: { type: Sequelize.INTEGER, allowNull: false },
          gender: { type: Sequelize.ENUM('female', 'male', 'other'), allowNull: false },
          is_lead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'booking_travellers', ['booking_id'], options);
    });
  },

  async down(queryInterface) {
    await dropTableWithEnums(queryInterface, 'booking_travellers', ['gender']);
    await dropTableWithEnums(queryInterface, 'bookings', ['status', 'payment_status', 'price_type']);
  },
};
