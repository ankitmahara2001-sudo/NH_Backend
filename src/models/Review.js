import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { flagColumn, foreignKeyColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class Review extends Model {}

Review.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(true),
    name: { type: DataTypes.STRING(120), allowNull: false },
    tripLabel: { type: DataTypes.STRING(160), allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.TEXT, allowNull: false },
    isPublished: flagColumn(true),
    sortOrder: sortOrderColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'reviews' },
);
