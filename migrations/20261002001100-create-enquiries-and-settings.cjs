'use strict';
const { timestamps, idColumn, dropTableWithEnums, addIndexes } = require('../db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'enquiries',
        {
          id: idColumn(Sequelize),
          name: { type: Sequelize.STRING(120), allowNull: false },
          email: { type: Sequelize.STRING(255), allowNull: false },
          phone: { type: Sequelize.STRING(20), allowNull: false },
          destination: { type: Sequelize.STRING(120), allowNull: true },
          travellers: { type: Sequelize.STRING(40), allowNull: true },
          travel_month: { type: Sequelize.STRING(40), allowNull: true },
          message: { type: Sequelize.TEXT, allowNull: true },
          status: {
            type: Sequelize.ENUM('new', 'contacted', 'closed'),
            allowNull: false,
            defaultValue: 'new',
          },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(queryInterface, 'enquiries', [['status', 'created_at']], options);

      await queryInterface.createTable(
        'site_settings',
        {
          id: idColumn(Sequelize),
          key: { type: Sequelize.STRING(60), allowNull: false, unique: true },
          value: { type: Sequelize.JSONB, allowNull: false },
          ...timestamps(Sequelize),
        },
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('site_settings');
    await dropTableWithEnums(queryInterface, 'enquiries', ['status']);
  },
};
