'use strict';
const {
  timestamps,
  idColumn,
  foreignKey,
  dropTableWithEnums,
  addIndexes,
} = require('../db/migrationHelpers.cjs');

const TRIP_TYPES = ['pilgrimage', 'trekking', 'honeymoon', 'family', 'adventure', 'wildlife', 'weekend'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'packages',
        {
          id: idColumn(Sequelize),
          destination_id: foreignKey(Sequelize, 'destinations', { onDelete: 'RESTRICT' }),
          title: { type: Sequelize.STRING(160), allowNull: false },
          slug: { type: Sequelize.STRING(160), allowNull: false, unique: true },
          trip_type: { type: Sequelize.ENUM(...TRIP_TYPES), allowNull: false },
          from_city: { type: Sequelize.STRING(120), allowNull: false },
          to_city: { type: Sequelize.STRING(120), allowNull: false },
          duration_days: { type: Sequelize.INTEGER, allowNull: false },
          duration_nights: { type: Sequelize.INTEGER, allowNull: false },
          overview: { type: Sequelize.TEXT, allowNull: false },
          group_size_min: { type: Sequelize.INTEGER, allowNull: true },
          group_size_max: { type: Sequelize.INTEGER, allowNull: true },
          best_time: { type: Sequelize.STRING(160), allowNull: true },
          stay_summary: { type: Sequelize.STRING(160), allowNull: true },
          transport: { type: Sequelize.STRING(160), allowNull: true },
          cover_image_url: { type: Sequelize.STRING(2048), allowNull: true },
          cover_image_public_id: { type: Sequelize.STRING(255), allowNull: true },
          availability_type: { type: Sequelize.ENUM('all_season', 'fixed_date'), allowNull: false },
          min_days_before_booking: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 3 },
          // NULL = use the site default booking percentage.
          booking_amount_percent: { type: Sequelize.INTEGER, allowNull: true },
          is_featured: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          is_popular: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          seo_title: { type: Sequelize.STRING(160), allowNull: true },
          seo_description: { type: Sequelize.STRING(320), allowNull: true },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await queryInterface.addConstraint('packages', {
        type: 'check',
        fields: ['booking_amount_percent'],
        where: { booking_amount_percent: { [Sequelize.Op.between]: [1, 100] } },
        name: 'packages_booking_amount_percent_range',
        transaction,
      });
      await addIndexes(
        queryInterface,
        'packages',
        [
          'destination_id',
          'trip_type',
          'availability_type',
          'duration_days',
          ['is_active', 'is_featured', 'sort_order'],
          ['is_active', 'is_popular'],
        ],
        { transaction },
      );
    });
  },

  async down(queryInterface) {
    await dropTableWithEnums(queryInterface, 'packages', ['trip_type', 'availability_type']);
  },
};
