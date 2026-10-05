import { DataTypes, Model } from 'sequelize';
import { REGIONS } from '../domain/enums.js';
import { sequelize } from '../lib/db.js';
import { enumColumn, flagColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class Destination extends Model {}

Destination.init(
  {
    id: idColumn(),
    name: { type: DataTypes.STRING(120), allowNull: false },
    slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    region: enumColumn(REGIONS),
    district: { type: DataTypes.STRING(120), allowNull: false },
    shortDescription: { type: DataTypes.STRING(500), allowNull: true },
    coverImageUrl: { type: DataTypes.STRING(2048), allowNull: true },
    coverImagePublicId: { type: DataTypes.STRING(255), allowNull: true },
    sortOrder: sortOrderColumn(),
    isActive: flagColumn(true),
    ...timestampColumns,
  },
  { sequelize, tableName: 'destinations' },
);
