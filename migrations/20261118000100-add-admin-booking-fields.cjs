'use strict';
const { money } = require('../db/migrationHelpers.cjs');

// Admin-panel bookings paid offline (cash, UPI, bank transfer): where the booking came from and an
// optional manual discount the admin gives before GST.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.addColumn(
        'bookings',
        'source',
        { type: Sequelize.ENUM('website', 'admin'), allowNull: false, defaultValue: 'website' },
        options,
      );
      await queryInterface.addColumn(
        'bookings',
        'manual_discount',
        money(Sequelize, { defaultValue: 0 }),
        options,
      );
      await queryInterface.addColumn(
        'bookings',
        'manual_discount_reason',
        { type: Sequelize.STRING(160), allowNull: true },
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.removeColumn('bookings', 'manual_discount_reason', options);
      await queryInterface.removeColumn('bookings', 'manual_discount', options);
      await queryInterface.removeColumn('bookings', 'source', options);
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_source";', options);
    });
  },
};
