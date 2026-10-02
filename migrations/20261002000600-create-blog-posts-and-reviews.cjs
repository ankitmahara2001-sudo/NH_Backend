'use strict';
const {
  timestamps,
  idColumn,
  foreignKey,
  dropTableWithEnums,
  addIndexes,
} = require('../db/migrationHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };

      await queryInterface.createTable(
        'blog_posts',
        {
          id: idColumn(Sequelize),
          title: { type: Sequelize.STRING(200), allowNull: false },
          slug: { type: Sequelize.STRING(160), allowNull: false, unique: true },
          category: {
            type: Sequelize.ENUM('guides', 'planning', 'treks', 'couples', 'food'),
            allowNull: false,
          },
          excerpt: { type: Sequelize.STRING(500), allowNull: false },
          // Sanitised HTML.
          content: { type: Sequelize.TEXT, allowNull: false },
          cover_image_url: { type: Sequelize.STRING(2048), allowNull: true },
          cover_image_public_id: { type: Sequelize.STRING(255), allowNull: true },
          author_name: { type: Sequelize.STRING(120), allowNull: false },
          author_role: { type: Sequelize.STRING(120), allowNull: true },
          read_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
          related_package_id: foreignKey(Sequelize, 'packages', { allowNull: true, onDelete: 'SET NULL' }),
          is_featured: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          status: { type: Sequelize.ENUM('draft', 'published'), allowNull: false, defaultValue: 'draft' },
          published_at: { type: Sequelize.DATE, allowNull: true },
          ...timestamps(Sequelize),
        },
        options,
      );
      await addIndexes(
        queryInterface,
        'blog_posts',
        ['related_package_id', 'category', ['status', 'published_at']],
        options,
      );

      await queryInterface.createTable(
        'reviews',
        {
          id: idColumn(Sequelize),
          package_id: foreignKey(Sequelize, 'packages', { allowNull: true, onDelete: 'SET NULL' }),
          name: { type: Sequelize.STRING(120), allowNull: false },
          trip_label: { type: Sequelize.STRING(160), allowNull: true },
          rating: { type: Sequelize.INTEGER, allowNull: false },
          text: { type: Sequelize.TEXT, allowNull: false },
          is_published: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          ...timestamps(Sequelize),
        },
        options,
      );
      await queryInterface.addConstraint('reviews', {
        type: 'check',
        fields: ['rating'],
        where: { rating: { [Sequelize.Op.between]: [1, 5] } },
        name: 'reviews_rating_range',
        transaction,
      });
      await addIndexes(queryInterface, 'reviews', ['package_id', ['is_published', 'sort_order']], options);
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reviews');
    await dropTableWithEnums(queryInterface, 'blog_posts', ['category', 'status']);
  },
};
