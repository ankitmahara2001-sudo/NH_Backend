import { DataTypes, Model } from 'sequelize';
import { PRICE_TYPES } from '@nh/shared';
import { sequelize } from '../lib/db.js';
import {
  enumColumn,
  flagColumn,
  foreignKeyColumn,
  idColumn,
  moneyColumn,
  sortOrderColumn,
  timestampColumns,
} from './columns.js';

export class PackagePrice extends Model {}

PackagePrice.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    label: { type: DataTypes.STRING(120), allowNull: false },
    priceType: enumColumn(PRICE_TYPES),
    personsCovered: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    // Paise. Selling price = discountedPrice ?? originalPrice.
    originalPrice: moneyColumn(),
    // NULL = no discount.
    discountedPrice: moneyColumn(true),
    note: { type: DataTypes.STRING(160), allowNull: true },
    isDefault: flagColumn(false),
    sortOrder: sortOrderColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_prices' },
);
