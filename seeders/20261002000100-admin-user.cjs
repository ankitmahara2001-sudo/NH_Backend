'use strict';
const path = require('node:path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 10;

/** The single admin account, created from ADMIN_* env variables. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    const name = (process.env.ADMIN_NAME || 'Admin').trim();

    if (!email || password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `Set ADMIN_EMAIL and ADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) in api/.env before seeding.`,
      );
    }

    const now = new Date();
    await queryInterface.bulkInsert('admin_users', [
      {
        name,
        email,
        password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('admin_users', null, {});
  },
};
