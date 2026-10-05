import { DataTypes, Model } from 'sequelize';
import { BOOKING_STATUSES, PAYMENT_STATUSES, PRICE_TYPES } from '../domain/enums.js';
import { sequelize } from '../lib/db.js';
import { enumColumn, foreignKeyColumn, idColumn, moneyColumn, timestampColumns } from './columns.js';

const countColumn = () => ({ type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 });

export class Booking extends Model {}

Booking.init(
  {
    id: idColumn(),
    // NH-<year>-<5-digit sequence>
    bookingNumber: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    customerId: foreignKeyColumn(),
    packageId: foreignKeyColumn(),
    packagePriceId: foreignKeyColumn(true),
    departureId: foreignKeyColumn(true),
    travelDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    pickupPoint: { type: DataTypes.STRING(160), allowNull: true },
    adults: countColumn(),
    children: countColumn(),
    infants: countColumn(),
    units: countColumn(),
    seats: countColumn(),
    leadName: { type: DataTypes.STRING(120), allowNull: false },
    leadEmail: { type: DataTypes.STRING(255), allowNull: false },
    leadPhone: { type: DataTypes.STRING(20), allowNull: false },
    specialRequests: { type: DataTypes.TEXT, allowNull: true },
    status: { ...enumColumn(BOOKING_STATUSES), defaultValue: 'pending' },
    paymentStatus: { ...enumColumn(PAYMENT_STATUSES), defaultValue: 'unpaid' },
    // ---- Price snapshot (money in paise) ----
    packageTitle: { type: DataTypes.STRING(160), allowNull: false },
    priceLabel: { type: DataTypes.STRING(120), allowNull: false },
    priceType: enumColumn(PRICE_TYPES),
    unitPrice: moneyColumn(),
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    subtotal: moneyColumn(),
    couponCode: { type: DataTypes.STRING(40), allowNull: true },
    discountAmount: { ...moneyColumn(), defaultValue: 0 },
    gstPercent: { type: DataTypes.INTEGER, allowNull: false },
    gstAmount: moneyColumn(),
    totalAmount: moneyColumn(),
    bookingAmountPercent: { type: DataTypes.INTEGER, allowNull: false },
    payNowAmount: moneyColumn(),
    amountPaid: { ...moneyColumn(), defaultValue: 0 },
    balanceDue: moneyColumn(),
    refundedAmount: { ...moneyColumn(), defaultValue: 0 },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
    cancelReason: { type: DataTypes.TEXT, allowNull: true },
    expiresAt: { type: DataTypes.DATE, allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'bookings' },
);
