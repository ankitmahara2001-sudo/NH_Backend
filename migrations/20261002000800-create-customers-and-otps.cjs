'use strict';
const { timestamps, idColumn, addIndexes } = require('../db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'customers',
        {
          id: idColumn(Sequelize),
          // Filled in after the first login.
          name: { type: Sequelize.STRING(120), allowNull: true },
          // Always stored lowercase.
          email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
          phone: { type: Sequelize.STRING(20), allowNull: true },
          email_verified_at: { type: Sequelize.DATE, allowNull: true },
          last_login_at: { type: Sequelize.DATE, allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );

      await queryInterface.createTable(
        'email_otps',
        {
          id: idColumn(Sequelize),
          email: { type: Sequelize.STRING(255), allowNull: false },
          code_hash: { type: Sequelize.STRING(255), allowNull: false },
          expires_at: { type: Sequelize.DATE, allowNull: false },
          attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          used_at: { type: Sequelize.DATE, allowNull: true },
          request_ip: { type: Sequelize.STRING(64), allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      // Rate limits count requests per email within the last hour.
      await addIndexes(queryInterface, 'email_otps', [['email', 'created_at'], 'expires_at'], options);
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_otps');
    await queryInterface.dropTable('customers');
  },
};
