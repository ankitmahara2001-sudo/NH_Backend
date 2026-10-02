'use strict';
const { timestamps, idColumn, dropTableWithEnums, addIndexes } = require('../db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'destinations',
        {
          id: idColumn(Sequelize),
          name: { type: Sequelize.STRING(120), allowNull: false },
          slug: { type: Sequelize.STRING(160), allowNull: false, unique: true },
          region: { type: Sequelize.ENUM('garhwal', 'kumaon'), allowNull: false },
          district: { type: Sequelize.STRING(120), allowNull: false },
          short_description: { type: Sequelize.STRING(500), allowNull: true },
          cover_image_url: { type: Sequelize.STRING(2048), allowNull: true },
          cover_image_public_id: { type: Sequelize.STRING(255), allowNull: true },
          sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          ...timestamps(Sequelize),
        },
        { transaction },
      );
      await addIndexes(queryInterface, 'destinations', ['region', ['is_active', 'sort_order']], {
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await dropTableWithEnums(queryInterface, 'destinations', ['region']);
  },
};
