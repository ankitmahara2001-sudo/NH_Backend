'use strict';

// Booking numbers (NH-<year>-<5-digit sequence>) take their sequence part from a PostgreSQL
// sequence: nextval() never hands the same value to two concurrent bookings.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1');
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP SEQUENCE IF EXISTS booking_number_seq');
  },
};
