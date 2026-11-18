'use strict';

// Optional cap on how many seats of a departure are sold through the website. The admin enters
// "seats left online"; it is stored as a cap on total booked seats so it goes down with each
// booking. NULL = no cap (the real seats left are shown and sold).

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('package_departures', 'online_seat_cap', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('package_departures', 'online_seat_cap');
  },
};
