import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { timestampColumns } from './columns.js';

/** Join table: which packages a coupon applies to when `appliesToAllPackages` is false. */
export class CouponPackage extends Model {}

CouponPackage.init(
  {
    couponId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    packageId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    ...timestampColumns,
  },
  { sequelize, tableName: 'coupon_packages' },
);
