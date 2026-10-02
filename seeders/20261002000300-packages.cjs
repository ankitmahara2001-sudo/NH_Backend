'use strict';
const packages = require('../db/seed-data/packages.cjs');
const {
  rupees,
  placeholderImage,
  PLACEHOLDER_WIDTH,
  PLACEHOLDER_HEIGHT,
  withTimestamps,
} = require('../db/seed-data/helpers.cjs');

const CHILD_TABLES = [
  'package_images',
  'package_faqs',
  'package_hotels',
  'package_highlights',
  'package_inclusions',
  'itinerary_days',
  'package_blocked_dates',
  'package_departures',
  'package_prices',
];

/** Inserts the 9 design packages and every child row (prices, itinerary, departures…). */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      const [destinationRows] = await queryInterface.sequelize.query(
        'SELECT id, slug FROM destinations',
        options,
      );
      const destinationIds = Object.fromEntries(destinationRows.map((row) => [row.slug, row.id]));

      for (const [index, pkg] of packages.entries()) {
        const destinationId = destinationIds[pkg.destination];
        if (!destinationId) throw new Error(`Unknown destination "${pkg.destination}" for ${pkg.slug}`);

        const {
          destination: _destination,
          prices,
          departures = [],
          blockedDates = [],
          itinerary,
          included,
          excluded,
          highlights,
          hotels,
          faqs,
          images,
          ...columns
        } = pkg;

        await queryInterface.bulkInsert(
          'packages',
          withTimestamps([
            {
              ...columns,
              destination_id: destinationId,
              cover_image_url: placeholderImage(index),
              cover_image_public_id: null,
              is_active: true,
            },
          ]),
          options,
        );
        const [[{ id: packageId }]] = await queryInterface.sequelize.query(
          'SELECT id FROM packages WHERE slug = :slug',
          { ...options, replacements: { slug: pkg.slug } },
        );

        const insert = (table, rows) =>
          rows.length ? queryInterface.bulkInsert(table, withTimestamps(rows), options) : Promise.resolve();

        await insert(
          'package_prices',
          prices.map((price, i) => ({
            package_id: packageId,
            label: price.label,
            price_type: price.price_type,
            persons_covered: price.persons_covered,
            original_price: rupees(price.original),
            discounted_price: price.discounted == null ? null : rupees(price.discounted),
            note: price.note || null,
            is_default: Boolean(price.is_default),
            sort_order: i + 1,
          })),
        );
        await insert(
          'package_departures',
          departures.map((departure) => ({ package_id: packageId, is_active: true, ...departure })),
        );
        await insert(
          'package_blocked_dates',
          blockedDates.map((blocked) => ({ package_id: packageId, ...blocked })),
        );
        await insert(
          'itinerary_days',
          itinerary.map(([title, description, meals, stay], i) => ({
            package_id: packageId,
            day_number: i + 1,
            title,
            description,
            meals,
            stay,
          })),
        );
        await insert('package_inclusions', [
          ...included.map((text, i) => ({
            package_id: packageId,
            type: 'included',
            text,
            sort_order: i + 1,
          })),
          ...excluded.map((text, i) => ({
            package_id: packageId,
            type: 'excluded',
            text,
            sort_order: i + 1,
          })),
        ]);
        await insert(
          'package_highlights',
          highlights.map(([title, text], i) => ({ package_id: packageId, title, text, sort_order: i + 1 })),
        );
        await insert(
          'package_hotels',
          hotels.map((hotel, i) => ({
            package_id: packageId,
            ...hotel,
            image_url: placeholderImage(index + i + 1),
            image_public_id: null,
            sort_order: i + 1,
          })),
        );
        await insert(
          'package_faqs',
          faqs.map(([question, answer], i) => ({
            package_id: packageId,
            question,
            answer,
            sort_order: i + 1,
          })),
        );
        await insert(
          'package_images',
          images.map((altText, i) => ({
            package_id: packageId,
            url: placeholderImage(index + i),
            public_id: null,
            alt_text: altText,
            width: PLACEHOLDER_WIDTH,
            height: PLACEHOLDER_HEIGHT,
            sort_order: i + 1,
          })),
        );
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of CHILD_TABLES) {
        await queryInterface.bulkDelete(table, null, { transaction });
      }
      await queryInterface.bulkDelete('packages', null, { transaction });
    });
  },
};
