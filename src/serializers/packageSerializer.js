import { savingPercent } from '@nh/shared';
import { addDays } from '../lib/dates.js';

// Shapes package data for the public API. Money stays in paise; the website formats it.

const HIGHLIGHTS_ON_CARD = 3;

function toNumberOrNull(value) {
  return value == null ? null : Number(value);
}

export function serializePrice(price) {
  const sellingPrice = price.discountedPrice ?? price.originalPrice;
  return {
    id: price.id,
    label: price.label,
    priceType: price.priceType,
    personsCovered: price.personsCovered,
    originalPrice: price.originalPrice,
    discountedPrice: price.discountedPrice,
    sellingPrice,
    savingPercent: savingPercent(price.originalPrice, price.discountedPrice),
    note: price.note,
    isDefault: price.isDefault,
  };
}

/** The option shown as "starting from": the default one, else the first by sort order. */
export function pickDisplayPrice(prices = []) {
  const sorted = [...prices].sort(
    (a, b) => Number(b.isDefault) - Number(a.isDefault) || a.sortOrder - b.sortOrder || a.id - b.id,
  );
  return sorted[0] ? serializePrice(sorted[0]) : null;
}

export function serializeDestinationSummary(destination) {
  if (!destination) return null;
  return {
    id: destination.id,
    name: destination.name,
    slug: destination.slug,
    region: destination.region,
    district: destination.district,
  };
}

function ratingSummary(pkg) {
  const reviewCount = Number(pkg.get?.('reviewCount') ?? pkg.reviewCount ?? 0);
  const average = toNumberOrNull(pkg.get?.('ratingAverage') ?? pkg.ratingAverage);
  return { rating: reviewCount ? average : null, reviewCount };
}

/** Compact data for package cards (lists, home page, related package). */
export function serializePackageCard(pkg) {
  const highlights = [...(pkg.highlights ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: pkg.id,
    slug: pkg.slug,
    title: pkg.title,
    tripType: pkg.tripType,
    destination: serializeDestinationSummary(pkg.destination),
    durationDays: pkg.durationDays,
    durationNights: pkg.durationNights,
    coverImageUrl: pkg.coverImageUrl,
    availabilityType: pkg.availabilityType,
    isFeatured: pkg.isFeatured,
    isPopular: pkg.isPopular,
    highlightTitles: highlights.slice(0, HIGHLIGHTS_ON_CARD).map((h) => h.title),
    price: pickDisplayPrice(pkg.prices),
    ...ratingSummary(pkg),
  };
}

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder || a.id - b.id;

/** Full package detail for /packages/:slug. */
export function serializePackageDetail(pkg, { departures, blockedDates, reviews, pricing }) {
  const inclusions = [...(pkg.inclusions ?? [])].sort(bySortOrder);
  return {
    ...serializePackageCard(pkg),
    fromCity: pkg.fromCity,
    toCity: pkg.toCity,
    overview: pkg.overview,
    groupSizeMin: pkg.groupSizeMin,
    groupSizeMax: pkg.groupSizeMax,
    bestTime: pkg.bestTime,
    staySummary: pkg.staySummary,
    transport: pkg.transport,
    minDaysBeforeBooking: pkg.minDaysBeforeBooking,
    seoTitle: pkg.seoTitle,
    seoDescription: pkg.seoDescription,
    prices: [...(pkg.prices ?? [])].sort(bySortOrder).map(serializePrice),
    itinerary: [...(pkg.itineraryDays ?? [])]
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map(({ dayNumber, title, description, meals, stay }) => ({
        dayNumber,
        title,
        description,
        meals,
        stay,
      })),
    included: inclusions.filter((i) => i.type === 'included').map((i) => i.text),
    excluded: inclusions.filter((i) => i.type === 'excluded').map((i) => i.text),
    highlights: [...(pkg.highlights ?? [])].sort(bySortOrder).map(({ title, text }) => ({ title, text })),
    hotels: [...(pkg.hotels ?? [])]
      .sort(bySortOrder)
      .map(({ id, name, rating, roomType, nights, amenities, imageUrl }) => ({
        id,
        name,
        rating,
        roomType,
        nights,
        amenities,
        imageUrl,
      })),
    faqs: [...(pkg.faqs ?? [])].sort(bySortOrder).map(({ question, answer }) => ({ question, answer })),
    images: [...(pkg.images ?? [])]
      .sort(bySortOrder)
      .map(({ id, url, altText, width, height }) => ({ id, url, altText, width, height })),
    departures,
    blockedDates,
    reviews,
    pricing,
  };
}

/** Public view of a departure, with seats left (null = unlimited). */
export function serializeDeparture(departure, durationNights) {
  const seatsLeft =
    departure.totalSeats == null ? null : Math.max(0, departure.totalSeats - departure.bookedSeats);
  return {
    id: departure.id,
    startDate: departure.startDate,
    endDate: addDays(departure.startDate, durationNights),
    totalSeats: departure.totalSeats,
    seatsLeft,
    soldOut: seatsLeft === 0,
  };
}
