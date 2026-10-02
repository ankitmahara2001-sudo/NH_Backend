import { sequelize } from '../../lib/db.js';
import { sanitizeRichText } from '../../lib/sanitizeHtml.js';
import { BlogPost, Destination, GalleryImage, HeroSlide, Package, Review } from '../../models/index.js';
import { createCrudService } from '../crudService.js';

const BY_SORT_ORDER = [
  ['sortOrder', 'ASC'],
  ['id', 'ASC'],
];

export const destinationAdmin = createCrudService({
  model: Destination,
  label: 'Destination',
  order: BY_SORT_ORDER,
  imageFields: ['coverImagePublicId'],
  listOptions: {
    attributes: {
      include: [
        [
          sequelize.literal(
            `(SELECT COUNT(*)::int FROM packages p WHERE p.destination_id = "Destination"."id")`,
          ),
          'packageCount',
        ],
      ],
    },
  },
});

export const heroSlideAdmin = createCrudService({
  model: HeroSlide,
  label: 'Slide',
  order: BY_SORT_ORDER,
  imageFields: ['imagePublicId'],
});

export const galleryAdmin = createCrudService({
  model: GalleryImage,
  label: 'Photo',
  order: BY_SORT_ORDER,
  imageFields: ['publicId'],
});

/** Adds several uploaded photos at the end of the gallery. */
export async function bulkCreateGalleryImages(images) {
  const last = (await GalleryImage.max('sortOrder')) ?? 0;
  const rows = await GalleryImage.bulkCreate(
    images.map((image, i) => ({ ...image, sortOrder: last + i + 1 })),
  );
  return rows.map((row) => row.get({ plain: true }));
}

export const reviewAdmin = createCrudService({
  model: Review,
  label: 'Review',
  order: BY_SORT_ORDER,
  listOptions: { include: [{ model: Package, as: 'package', attributes: ['id', 'title'] }] },
});

export const blogAdmin = createCrudService({
  model: BlogPost,
  label: 'Article',
  order: [
    ['createdAt', 'DESC'],
    ['id', 'DESC'],
  ],
  imageFields: ['coverImagePublicId'],
  listOptions: { include: [{ model: Package, as: 'relatedPackage', attributes: ['id', 'title', 'slug'] }] },
  prepare: (input, existing) => ({
    ...input,
    content: sanitizeRichText(input.content),
    // Publishing without a date publishes now; an existing date is kept.
    publishedAt:
      input.status === 'published'
        ? (input.publishedAt ?? existing?.publishedAt ?? new Date())
        : (input.publishedAt ?? null),
  }),
});
