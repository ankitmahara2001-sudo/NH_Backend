// Public shapes for destinations, hero slides, gallery, blog posts, reviews and offers.

export function serializeDestination(destination) {
  return {
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    region: destination.region,
    district: destination.district,
    shortDescription: destination.shortDescription,
    coverImageUrl: destination.coverImageUrl,
    packageCount: Number(destination.get?.('packageCount') ?? 0),
  };
}

export function serializeHeroSlide(slide) {
  return {
    id: slide.id,
    title: slide.title,
    region: slide.region,
    caption: slide.caption,
    imageUrl: slide.imageUrl,
    linkUrl: slide.linkUrl,
  };
}

export function serializeGalleryImage(image) {
  return {
    id: image.id,
    url: image.url,
    caption: image.caption,
    place: image.place,
    category: image.category,
    width: image.width,
    height: image.height,
  };
}

export function serializeReview(review) {
  return {
    id: review.id,
    name: review.name,
    tripLabel: review.tripLabel,
    rating: review.rating,
    text: review.text,
  };
}

export function serializeBlogPostSummary(post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    category: post.category,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    authorName: post.authorName,
    authorRole: post.authorRole,
    readMinutes: post.readMinutes,
    isFeatured: post.isFeatured,
    publishedAt: post.publishedAt,
  };
}

export function serializeOffer(coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscount: coupon.maxDiscount,
    minOrderAmount: coupon.minOrderAmount,
    appliesToPriceType: coupon.appliesToPriceType,
    appliesToAllPackages: coupon.appliesToAllPackages,
    packages: coupon.appliesToAllPackages
      ? []
      : (coupon.packages ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          tripType: p.tripType,
        })),
    validUntil: coupon.validUntil,
  };
}
