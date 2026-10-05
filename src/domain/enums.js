// Every enum value stored in the database. Values are stored as-is in PostgreSQL ENUM columns.

export const PRICE_TYPES = ['per_person', 'per_couple', 'per_group'];

export const AVAILABILITY_TYPES = ['all_season', 'fixed_date'];

export const TRIP_TYPES = [
  'pilgrimage',
  'trekking',
  'honeymoon',
  'family',
  'adventure',
  'wildlife',
  'weekend',
];

export const REGIONS = ['garhwal', 'kumaon'];

export const INCLUSION_TYPES = ['included', 'excluded'];

export const GALLERY_CATEGORIES = ['temples', 'treks', 'snow', 'lakes_rivers', 'travellers'];

export const BLOG_CATEGORIES = ['guides', 'planning', 'treks', 'couples', 'food'];

export const BLOG_STATUSES = ['draft', 'published'];

export const DISCOUNT_TYPES = ['percent', 'flat'];

export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

export const PAYMENT_STATUSES = ['unpaid', 'advance_paid', 'fully_paid', 'refunded'];

export const PAYMENT_TYPES = ['advance', 'balance', 'refund'];

export const PAYMENT_METHODS = ['razorpay', 'cash', 'upi', 'bank_transfer', 'other'];

/** Methods an admin can pick when recording an offline (balance) payment. */
export const OFFLINE_PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'other'];

export const PAYMENT_RECORD_STATUSES = ['created', 'captured', 'failed', 'recorded', 'refunded'];

export const ENQUIRY_STATUSES = ['new', 'contacted', 'closed'];

export const GENDERS = ['female', 'male', 'other'];

/** Cloudinary sub-folders (under CLOUDINARY_ROOT_FOLDER) per kind of upload. */
export const UPLOAD_FOLDERS = ['packages', 'gallery', 'hero', 'blog', 'destinations', 'team', 'hotels'];

export const SITE_SETTING_KEYS = [
  'gst_percent',
  'default_booking_percent',
  'company',
  'social',
  'home',
  'about',
  'contact',
  'booking',
  'policies',
  'seo',
  'email',
  'pages',
];
