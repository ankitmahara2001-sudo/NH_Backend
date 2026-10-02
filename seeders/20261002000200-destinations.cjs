'use strict';
const destinations = require('../db/seed-data/destinations.cjs');
const { placeholderImage, withTimestamps } = require('../db/seed-data/helpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'destinations',
      withTimestamps(
        destinations.map((destination, index) => ({
          ...destination,
          cover_image_url: placeholderImage(index),
          cover_image_public_id: null,
          sort_order: index + 1,
          is_active: true,
        })),
      ),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('destinations', null, {});
  },
};
