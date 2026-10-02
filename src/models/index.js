// All models and every association, defined in one place (see CLAUDE.md section 3).
import { AdminUser } from './AdminUser.js';
import { BlogPost } from './BlogPost.js';
import { Booking } from './Booking.js';
import { BookingTraveller } from './BookingTraveller.js';
import { Coupon } from './Coupon.js';
import { CouponPackage } from './CouponPackage.js';
import { CouponRedemption } from './CouponRedemption.js';
import { Customer } from './Customer.js';
import { Destination } from './Destination.js';
import { EmailOtp } from './EmailOtp.js';
import { Enquiry } from './Enquiry.js';
import { GalleryImage } from './GalleryImage.js';
import { HeroSlide } from './HeroSlide.js';
import { ItineraryDay } from './ItineraryDay.js';
import { Package } from './Package.js';
import { PackageBlockedDate } from './PackageBlockedDate.js';
import { PackageDeparture } from './PackageDeparture.js';
import { PackageFaq } from './PackageFaq.js';
import { PackageHighlight } from './PackageHighlight.js';
import { PackageHotel } from './PackageHotel.js';
import { PackageImage } from './PackageImage.js';
import { PackageInclusion } from './PackageInclusion.js';
import { PackagePrice } from './PackagePrice.js';
import { Payment } from './Payment.js';
import { Review } from './Review.js';
import { SiteSetting } from './SiteSetting.js';

// ---- Destinations and packages ----------------------------------------------------

Destination.hasMany(Package, { as: 'packages', foreignKey: 'destinationId', onDelete: 'RESTRICT' });
Package.belongsTo(Destination, { as: 'destination', foreignKey: 'destinationId' });

/** Child rows of a package: deleted with it and loaded as `package.<alias>`. */
function packageChild(child, alias) {
  Package.hasMany(child, { as: alias, foreignKey: 'packageId', onDelete: 'CASCADE' });
  child.belongsTo(Package, { as: 'package', foreignKey: 'packageId' });
}

packageChild(PackagePrice, 'prices');
packageChild(PackageDeparture, 'departures');
packageChild(PackageBlockedDate, 'blockedDates');
packageChild(ItineraryDay, 'itineraryDays');
packageChild(PackageInclusion, 'inclusions');
packageChild(PackageHighlight, 'highlights');
packageChild(PackageHotel, 'hotels');
packageChild(PackageFaq, 'faqs');
packageChild(PackageImage, 'images');

Package.hasMany(Review, { as: 'reviews', foreignKey: 'packageId', onDelete: 'SET NULL' });
Review.belongsTo(Package, { as: 'package', foreignKey: 'packageId' });

Package.hasMany(BlogPost, { as: 'blogPosts', foreignKey: 'relatedPackageId', onDelete: 'SET NULL' });
BlogPost.belongsTo(Package, { as: 'relatedPackage', foreignKey: 'relatedPackageId' });

// ---- Coupons ------------------------------------------------------------------------

Coupon.belongsToMany(Package, {
  as: 'packages',
  through: CouponPackage,
  foreignKey: 'couponId',
  otherKey: 'packageId',
});
Package.belongsToMany(Coupon, {
  as: 'coupons',
  through: CouponPackage,
  foreignKey: 'packageId',
  otherKey: 'couponId',
});

Coupon.hasMany(CouponRedemption, { as: 'redemptions', foreignKey: 'couponId', onDelete: 'RESTRICT' });
CouponRedemption.belongsTo(Coupon, { as: 'coupon', foreignKey: 'couponId' });

// ---- Customers, bookings and payments ------------------------------------------------

Customer.hasMany(Booking, { as: 'bookings', foreignKey: 'customerId', onDelete: 'RESTRICT' });
Booking.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });

Package.hasMany(Booking, { as: 'bookings', foreignKey: 'packageId', onDelete: 'RESTRICT' });
Booking.belongsTo(Package, { as: 'package', foreignKey: 'packageId' });

PackagePrice.hasMany(Booking, { as: 'bookings', foreignKey: 'packagePriceId', onDelete: 'SET NULL' });
Booking.belongsTo(PackagePrice, { as: 'packagePrice', foreignKey: 'packagePriceId' });

PackageDeparture.hasMany(Booking, { as: 'bookings', foreignKey: 'departureId', onDelete: 'RESTRICT' });
Booking.belongsTo(PackageDeparture, { as: 'departure', foreignKey: 'departureId' });

Booking.hasMany(BookingTraveller, { as: 'travellers', foreignKey: 'bookingId', onDelete: 'CASCADE' });
BookingTraveller.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });

Booking.hasMany(Payment, { as: 'payments', foreignKey: 'bookingId', onDelete: 'RESTRICT' });
Payment.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });

Booking.hasOne(CouponRedemption, { as: 'couponRedemption', foreignKey: 'bookingId', onDelete: 'RESTRICT' });
CouponRedemption.belongsTo(Booking, { as: 'booking', foreignKey: 'bookingId' });

Customer.hasMany(CouponRedemption, {
  as: 'couponRedemptions',
  foreignKey: 'customerId',
  onDelete: 'RESTRICT',
});
CouponRedemption.belongsTo(Customer, { as: 'customer', foreignKey: 'customerId' });

export {
  AdminUser,
  BlogPost,
  Booking,
  BookingTraveller,
  Coupon,
  CouponPackage,
  CouponRedemption,
  Customer,
  Destination,
  EmailOtp,
  Enquiry,
  GalleryImage,
  HeroSlide,
  ItineraryDay,
  Package,
  PackageBlockedDate,
  PackageDeparture,
  PackageFaq,
  PackageHighlight,
  PackageHotel,
  PackageImage,
  PackageInclusion,
  PackagePrice,
  Payment,
  Review,
  SiteSetting,
};
