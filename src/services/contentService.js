import { Op } from 'sequelize';
import { AppError } from '../lib/AppError.js';
import { sequelize } from '../lib/db.js';
import { paginationMeta, toLimitOffset } from '../lib/pagination.js';
import { BlogPost, Coupon, Destination, GalleryImage, HeroSlide, Package, Review } from '../models/index.js';
import {
  serializeBlogPostSummary,
  serializeDestination,
  serializeGalleryImage,
  serializeHeroSlide,
  serializeOffer,
  serializeReview,
} from '../serializers/contentSerializer.js';
import { findPackageCards } from './packageCatalogService.js';

// Read-only public content. Only active / published rows are returned.

const HOME_LIMITS = { destinations: 4, packages: 3, offers: 3, gallery: 5, reviews: 3, posts: 3 };
const RELATED_POSTS = 3;
const BY_SORT_ORDER = [
  ['sortOrder', 'ASC'],
  ['id', 'ASC'],
];
const NEWEST_FIRST = [
  ['publishedAt', 'DESC'],
  ['id', 'DESC'],
];

const PACKAGE_COUNT_ATTRIBUTE = [
  sequelize.literal(
    `(SELECT COUNT(*) FROM packages p WHERE p.destination_id = "Destination"."id" AND p.is_active)`,
  ),
  'packageCount',
];

const publishedPostWhere = () => ({ status: 'published', publishedAt: { [Op.lte]: new Date() } });

export async function listDestinations({ limit } = {}) {
  const rows = await Destination.findAll({
    where: { isActive: true },
    attributes: { include: [PACKAGE_COUNT_ATTRIBUTE] },
    order: BY_SORT_ORDER,
    limit,
  });
  return rows.map(serializeDestination);
}

/** Coupons shown on the Offers page and the home page: active, marked for the site and in date. */
export async function listOffers({ limit } = {}) {
  const now = new Date();
  const rows = await Coupon.findAll({
    where: {
      isActive: true,
      showOnSite: true,
      [Op.and]: [
        { [Op.or]: [{ validFrom: null }, { validFrom: { [Op.lte]: now } }] },
        { [Op.or]: [{ validUntil: null }, { validUntil: { [Op.gte]: now } }] },
      ],
    },
    include: [
      {
        model: Package,
        as: 'packages',
        attributes: ['id', 'title', 'slug', 'tripType'],
        where: { isActive: true },
        required: false,
        through: { attributes: [] },
      },
    ],
    order: [
      ['validUntil', 'ASC'],
      ['id', 'ASC'],
    ],
    limit,
  });
  return rows.map(serializeOffer);
}

export async function listGallery({ category, limit } = {}) {
  const rows = await GalleryImage.findAll({
    where: { isActive: true, ...(category ? { category } : {}) },
    order: BY_SORT_ORDER,
    limit,
  });
  return rows.map(serializeGalleryImage);
}

export async function listHeroSlides() {
  const rows = await HeroSlide.findAll({ where: { isActive: true }, order: BY_SORT_ORDER });
  return rows.map(serializeHeroSlide);
}

export async function listTestimonials({ limit } = {}) {
  const rows = await Review.findAll({ where: { isPublished: true }, order: BY_SORT_ORDER, limit });
  return rows.map(serializeReview);
}

/** GET /home — everything the home page needs in one request. */
export async function getHomeContent() {
  const [slides, destinations, packages, offers, gallery, reviews, posts] = await Promise.all([
    listHeroSlides(),
    listDestinations({ limit: HOME_LIMITS.destinations }),
    findPackageCards({ isPopular: true }, { limit: HOME_LIMITS.packages }),
    listOffers({ limit: HOME_LIMITS.offers }),
    listGallery({ limit: HOME_LIMITS.gallery }),
    listTestimonials({ limit: HOME_LIMITS.reviews }),
    BlogPost.findAll({ where: publishedPostWhere(), order: NEWEST_FIRST, limit: HOME_LIMITS.posts }),
  ]);
  return {
    slides,
    destinations,
    packages,
    offers,
    gallery,
    reviews,
    posts: posts.map(serializeBlogPostSummary),
  };
}

/** GET /blog — the latest featured post plus a paginated list of the others. */
export async function listBlogPosts({ category, page, pageSize }) {
  const featured = await BlogPost.findOne({
    where: { ...publishedPostWhere(), isFeatured: true },
    order: NEWEST_FIRST,
  });

  const where = {
    ...publishedPostWhere(),
    ...(category ? { category } : {}),
    ...(featured ? { id: { [Op.ne]: featured.id } } : {}),
  };
  const { rows, count } = await BlogPost.findAndCountAll({
    where,
    order: NEWEST_FIRST,
    ...toLimitOffset(page, pageSize),
  });

  return {
    data: {
      featured:
        featured && (!category || featured.category === category) ? serializeBlogPostSummary(featured) : null,
      posts: rows.map(serializeBlogPostSummary),
    },
    meta: paginationMeta(page, pageSize, count),
  };
}

/** GET /blog/:slug — the post, related posts (same category first) and its related package. */
export async function getBlogPost(slug) {
  const post = await BlogPost.findOne({ where: { ...publishedPostWhere(), slug } });
  if (!post) throw AppError.notFound('This article does not exist or is not published.');

  const [sameCategory, relatedPackage] = await Promise.all([
    BlogPost.findAll({
      where: { ...publishedPostWhere(), id: { [Op.ne]: post.id } },
      order: [
        [sequelize.literal(`("BlogPost"."category" = ${sequelize.escape(post.category)})`), 'DESC'],
        ...NEWEST_FIRST,
      ],
      limit: RELATED_POSTS,
    }),
    post.relatedPackageId ? findPackageCards({ id: post.relatedPackageId }, { limit: 1 }) : [],
  ]);

  return {
    ...serializeBlogPostSummary(post),
    content: post.content,
    relatedPackage: relatedPackage[0] ?? null,
    relatedPosts: sameCategory.map(serializeBlogPostSummary),
  };
}
