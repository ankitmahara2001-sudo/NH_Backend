import { DataTypes, Model } from 'sequelize';
import { AVAILABILITY_TYPES, DEFAULT_MIN_DAYS_BEFORE_BOOKING, TRIP_TYPES } from '@nh/shared';
import { sequelize } from '../lib/db.js';
import {
  enumColumn,
  flagColumn,
  foreignKeyColumn,
  idColumn,
  sortOrderColumn,
  timestampColumns,
} from './columns.js';

export class Package extends Model {}

Package.init(
  {
    id: idColumn(),
    destinationId: foreignKeyColumn(),
    title: { type: DataTypes.STRING(160), allowNull: false },
    slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    tripType: enumColumn(TRIP_TYPES),
    fromCity: { type: DataTypes.STRING(120), allowNull: false },
    toCity: { type: DataTypes.STRING(120), allowNull: false },
    durationDays: { type: DataTypes.INTEGER, allowNull: false },
    durationNights: { type: DataTypes.INTEGER, allowNull: false },
    overview: { type: DataTypes.TEXT, allowNull: false },
    groupSizeMin: { type: DataTypes.INTEGER, allowNull: true },
    groupSizeMax: { type: DataTypes.INTEGER, allowNull: true },
    bestTime: { type: DataTypes.STRING(160), allowNull: true },
    staySummary: { type: DataTypes.STRING(160), allowNull: true },
    transport: { type: DataTypes.STRING(160), allowNull: true },
    coverImageUrl: { type: DataTypes.STRING(2048), allowNull: true },
    coverImagePublicId: { type: DataTypes.STRING(255), allowNull: true },
    availabilityType: enumColumn(AVAILABILITY_TYPES),
    minDaysBeforeBooking: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: DEFAULT_MIN_DAYS_BEFORE_BOOKING,
    },
    // NULL = use the site default booking percentage.
    bookingAmountPercent: { type: DataTypes.INTEGER, allowNull: true },
    isFeatured: flagColumn(false),
    isPopular: flagColumn(false),
    isActive: flagColumn(true),
    sortOrder: sortOrderColumn(),
    seoTitle: { type: DataTypes.STRING(160), allowNull: true },
    seoDescription: { type: DataTypes.STRING(320), allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'packages' },
);
