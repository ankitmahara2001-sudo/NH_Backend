import { Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { foreignKeyColumn, idColumn, timestampColumns } from './columns.js';

/** Written only when a booking's advance payment is captured. */
export class CouponRedemption extends Model {}

CouponRedemption.init(
  {
    id: idColumn(),
    couponId: foreignKeyColumn(),
    bookingId: { ...foreignKeyColumn(), unique: true },
    customerId: foreignKeyColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'coupon_redemptions' },
);
