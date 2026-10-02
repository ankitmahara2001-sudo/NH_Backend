import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { foreignKeyColumn, idColumn, timestampColumns } from './columns.js';

export class ItineraryDay extends Model {}

ItineraryDay.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    dayNumber: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    meals: { type: DataTypes.STRING(160), allowNull: true },
    stay: { type: DataTypes.STRING(160), allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'itinerary_days' },
);
