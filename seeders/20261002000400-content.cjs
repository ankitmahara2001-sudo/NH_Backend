'use strict';
const { heroSlides, galleryImages, blogPosts, reviews } = require('../db/seed-data/content.cjs');
const {
  placeholderImage,
  PLACEHOLDER_WIDTH,
  PLACEHOLDER_HEIGHT,
  withTimestamps,
} = require('../db/seed-data/helpers.cjs');

/** Hero slides, gallery images, blog posts and reviews. */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const options = { transaction };
      const [packageRows] = await queryInterface.sequelize.query('SELECT id, slug FROM packages', options);
      const packageIds = Object.fromEntries(packageRows.map((row) => [row.slug, row.id]));
      const packageIdFor = (slug) => {
        if (slug == null) return null;
        if (!packageIds[slug]) throw new Error(`Unknown package "${slug}" in content seed data`);
        return packageIds[slug];
      };

      await queryInterface.bulkInsert(
        'hero_slides',
        withTimestamps(
          heroSlides.map((slide, i) => ({
            ...slide,
            image_url: placeholderImage(i),
            image_public_id: null,
            sort_order: i + 1,
            is_active: true,
          })),
        ),
        options,
      );

      await queryInterface.bulkInsert(
        'gallery_images',
        withTimestamps(
          galleryImages.map((image, i) => ({
            ...image,
            url: placeholderImage(i),
            public_id: null,
            width: PLACEHOLDER_WIDTH,
            height: PLACEHOLDER_HEIGHT,
            sort_order: i + 1,
            is_active: true,
          })),
        ),
        options,
      );

      await queryInterface.bulkInsert(
        'blog_posts',
        withTimestamps(
          blogPosts.map(({ related_package: relatedPackage, published_at: publishedAt, ...post }, i) => ({
            ...post,
            cover_image_url: placeholderImage(i),
            cover_image_public_id: null,
            related_package_id: packageIdFor(relatedPackage),
            status: 'published',
            published_at: new Date(publishedAt),
          })),
        ),
        options,
      );

      await queryInterface.bulkInsert(
        'reviews',
        withTimestamps(
          reviews.map(({ package: packageSlug, ...review }, i) => ({
            ...review,
            package_id: packageIdFor(packageSlug),
            is_published: true,
            sort_order: i + 1,
          })),
        ),
        options,
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ['reviews', 'blog_posts', 'gallery_images', 'hero_slides']) {
        await queryInterface.bulkDelete(table, null, { transaction });
      }
    });
  },
};
