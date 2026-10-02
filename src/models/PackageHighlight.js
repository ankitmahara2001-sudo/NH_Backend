import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { foreignKeyColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class PackageHighlight extends Model {}

PackageHighlight.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    title: { type: DataTypes.STRING(120), allowNull: false },
    text: { type: DataTypes.STRING(255), allowNull: false },
    sortOrder: sortOrderColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_highlights' },
);
