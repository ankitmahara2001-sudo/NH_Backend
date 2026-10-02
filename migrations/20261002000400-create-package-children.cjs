'use strict';
const {
  timestamps,
  idColumn,
  foreignKey,
  money,
  dropTableWithEnums,
  addIndexes,
} = require('../db/migrationHelpers.cjs');

// Every child table of `packages`. Rows are deleted with their package (ON DELETE CASCADE),
// although packages with bookings are only ever deactivated, never deleted.

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      const packageId = () => foreignKey(Sequelize, 'packages');
      const sortOrder = () => ({ type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });

      await queryInterface.createTable(
        'package_prices',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          label: { type: Sequelize.STRING(120), allowNull: false },
          price_type: { type: Sequelize.ENUM('per_person', 'per_couple', 'per_group'), allowNull: false },
          persons_covered: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          original_price: money(Sequelize),
          discounted_price: money(Sequelize, { allowNull: true }),
          note: { type: Sequelize.STRING(160), allowNull: true },
          is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          sort_order: sortOrder(),
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'package_prices', ['package_id', 'price_type'], options);

      await queryInterface.createTable(
        'package_departures',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          start_date: { type: Sequelize.DATEONLY, allowNull: false },
          // NULL = unlimited seats.
          total_seats: { type: Sequelize.INTEGER, allowNull: true },
          booked_seats: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await queryInterface.addConstraint('package_departures', {
        type: 'unique',
        fields: ['package_id', 'start_date'],
        name: 'package_departures_package_id_start_date_unique',
        transaction,
      });
      await addIndexes(queryInterface, 'package_departures', ['start_date'], options);

      await queryInterface.createTable(
        'package_blocked_dates',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          start_date: { type: Sequelize.DATEONLY, allowNull: false },
          end_date: { type: Sequelize.DATEONLY, allowNull: false },
          reason: { type: Sequelize.STRING(160), allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(
        queryInterface,
        'package_blocked_dates',
        ['package_id', ['start_date', 'end_date']],
        options,
      );

      await queryInterface.createTable(
        'itinerary_days',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          day_number: { type: Sequelize.INTEGER, allowNull: false },
          title: { type: Sequelize.STRING(160), allowNull: false },
          description: { type: Sequelize.TEXT, allowNull: false },
          meals: { type: Sequelize.STRING(160), allowNull: true },
          stay: { type: Sequelize.STRING(160), allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      // The unique (package_id, day_number) index also serves lookups by package_id.
      await queryInterface.addConstraint('itinerary_days', {
        type: 'unique',
        fields: ['package_id', 'day_number'],
        name: 'itinerary_days_package_id_day_number_unique',
        transaction,
      });

      await queryInterface.createTable(
        'package_inclusions',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          type: { type: Sequelize.ENUM('included', 'excluded'), allowNull: false },
          text: { type: Sequelize.STRING(255), allowNull: false },
          sort_order: sortOrder(),
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'package_inclusions', ['package_id'], options);

      await queryInterface.createTable(
        'package_highlights',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          title: { type: Sequelize.STRING(120), allowNull: false },
          text: { type: Sequelize.STRING(255), allowNull: false },
          sort_order: sortOrder(),
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'package_highlights', ['package_id'], options);

      await queryInterface.createTable(
        'package_hotels',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          name: { type: Sequelize.STRING(160), allowNull: false },
          // A star rating, not money, so DECIMAL is fine here.
          rating: { type: Sequelize.DECIMAL(2, 1), allowNull: true },
          room_type: { type: Sequelize.STRING(120), allowNull: true },
          nights: { type: Sequelize.INTEGER, allowNull: true },
          amenities: { type: Sequelize.STRING(255), allowNull: true },
          image_url: { type: Sequelize.STRING(2048), allowNull: true },
          image_public_id: { type: Sequelize.STRING(255), allowNull: true },
          sort_order: sortOrder(),
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'package_hotels', ['package_id'], options);

      await queryInterface.createTable(
        'package_faqs',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          question: { type: Sequelize.STRING(255), allowNull: false },
          answer: { type: Sequelize.TEXT, allowNull: false },
          sort_order: sortOrder(),
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'package_faqs', ['package_id'], options);

      await queryInterface.createTable(
        'package_images',
        {
          id: idColumn(Sequelize),
          package_id: packageId(),
          url: { type: Sequelize.STRING(2048), allowNull: false },
          public_id: { type: Sequelize.STRING(255), allowNull: true },
          alt_text: { type: Sequelize.STRING(255), allowNull: true },
          width: { type: Sequelize.INTEGER, allowNull: true },
          height: { type: Sequelize.INTEGER, allowNull: true },
          sort_order: sortOrder(),
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'package_images', ['package_id'], options);
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      await queryInterface.dropTable('package_images', options);
      await queryInterface.dropTable('package_faqs', options);
      await queryInterface.dropTable('package_hotels', options);
      await queryInterface.dropTable('package_highlights', options);
      await dropTableWithEnums(queryInterface, 'package_inclusions', ['type'], options);
      await queryInterface.dropTable('itinerary_days', options);
      await queryInterface.dropTable('package_blocked_dates', options);
      await queryInterface.dropTable('package_departures', options);
      await dropTableWithEnums(queryInterface, 'package_prices', ['price_type'], options);
    });
  },
};
