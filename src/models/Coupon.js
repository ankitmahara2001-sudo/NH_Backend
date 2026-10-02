import { DataTypes, Model } from 'sequelize';
import { DISCOUNT_TYPES, PRICE_TYPES } from '@nh/shared';
import { sequelize } from '../lib/db.js';
import { enumColumn, flagColumn, idColumn, moneyColumn, timestampColumns } from './columns.js';

export class Coupon extends Model {}

Coupon.init(
  {
    id: idColumn(),
    code: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('code', value.trim().toUpperCase());
      },
    },
    description: { type: DataTypes.STRING(255), allowNull: false },
    discountType: enumColumn(DISCOUNT_TYPES),
    // percent: whole number (10 = 10%); flat: paise.
    discountValue: { type: DataTypes.INTEGER, allowNull: false },
    // Paise; caps a percent discount.
    maxDiscount: moneyColumn(true),
    // Paise; compared with the subtotal.
    minOrderAmount: moneyColumn(true),
    // NULL = any price type.
    appliesToPriceType: enumColumn(PRICE_TYPES, true),
    appliesToAllPackages: flagColumn(true),
    validFrom: { type: DataTypes.DATE, allowNull: true },
    validUntil: { type: DataTypes.DATE, allowNull: true },
    totalUsageLimit: { type: DataTypes.INTEGER, allowNull: true },
    perCustomerLimit: { type: DataTypes.INTEGER, allowNull: true },
    showOnSite: flagColumn(false),
    isActive: flagColumn(true),
    ...timestampColumns,
  },
  { sequelize, tableName: 'coupons' },
);
