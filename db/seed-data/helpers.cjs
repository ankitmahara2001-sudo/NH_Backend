// Helpers shared by the seeders.

/** ₹ amount -> integer paise. */
const rupees = (amount) => Math.round(amount * 100);

/**
 * PLACEHOLDER IMAGES — replace with real photos from the admin panel.
 * These are public sample images from Cloudinary's "demo" account so the site renders
 * out of the box. Every seeded image uses one of them and has public_id = NULL, so
 * nothing tries to delete them from our own Cloudinary account.
 */
const PLACEHOLDER_IMAGES = [
  'https://res.cloudinary.com/demo/image/upload/samples/landscapes/nature-mountains.jpg',
  'https://res.cloudinary.com/demo/image/upload/samples/landscapes/landscape-panorama.jpg',
  'https://res.cloudinary.com/demo/image/upload/samples/landscapes/architecture-signs.jpg',
  'https://res.cloudinary.com/demo/image/upload/samples/landscapes/beach-boat.jpg',
  'https://res.cloudinary.com/demo/image/upload/samples/landscapes/girl-urban-view.jpg',
];
const PLACEHOLDER_PORTRAIT = 'https://res.cloudinary.com/demo/image/upload/samples/people/smiling-man.jpg';
const PLACEHOLDER_WIDTH = 1920;
const PLACEHOLDER_HEIGHT = 1280;

/** Picks a placeholder deterministically so re-seeding gives the same result. */
const placeholderImage = (index) => PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];

/** Adds created_at / updated_at to every row for bulkInsert. */
function withTimestamps(rows) {
  const now = new Date();
  return rows.map((row) => ({ ...row, created_at: now, updated_at: now }));
}

/** End of a day in India (UTC+5:30) as a Date, for coupon validity. */
const endOfDayIst = (isoDate) => new Date(`${isoDate}T23:59:59+05:30`);

module.exports = {
  rupees,
  placeholderImage,
  PLACEHOLDER_PORTRAIT,
  PLACEHOLDER_WIDTH,
  PLACEHOLDER_HEIGHT,
  withTimestamps,
  endOfDayIst,
};
