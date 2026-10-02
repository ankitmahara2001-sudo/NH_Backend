'use strict';
const settings = require('../db/seed-data/settings.cjs');
const { withTimestamps } = require('../db/seed-data/helpers.cjs');

/** Every site_settings key with the texts from the design files. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value: JSON.stringify(value) }));
    await queryInterface.bulkInsert('site_settings', withTimestamps(rows));
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('site_settings', null, {});
  },
};
