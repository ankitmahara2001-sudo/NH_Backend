'use strict';
const { timestamps, idColumn, dropTableWithEnums, addIndexes } = require('../db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'hero_slides',
        {
          id: idColumn(Sequelize),
          title: { type: Sequelize.STRING(120), allowNull: false },
          region: { type: Sequelize.STRING(120), allowNull: false },
          caption: { type: Sequelize.STRING(255), allowNull: true },
          image_url: { type: Sequelize.STRING(2048), allowNull: false },
          image_public_id: { type: Sequelize.STRING(255), allowNull: true },
          link_url: { type: Sequelize.STRING(2048), allowNull: true },
          sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'hero_slides', [['is_active', 'sort_order']], options);

      await queryInterface.createTable(
        'gallery_images',
        {
          id: idColumn(Sequelize),
          url: { type: Sequelize.STRING(2048), allowNull: false },
          public_id: { type: Sequelize.STRING(255), allowNull: true },
          caption: { type: Sequelize.STRING(255), allowNull: true },
          place: { type: Sequelize.STRING(120), allowNull: true },
          category: {
            type: Sequelize.ENUM('temples', 'treks', 'snow', 'lakes_rivers', 'travellers'),
            allowNull: false,
          },
          width: { type: Sequelize.INTEGER, allowNull: true },
          height: { type: Sequelize.INTEGER, allowNull: true },
          sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'gallery_images', ['category', ['is_active', 'sort_order']], options);
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('hero_slides');
    await dropTableWithEnums(queryInterface, 'gallery_images', ['category']);
  },
};
