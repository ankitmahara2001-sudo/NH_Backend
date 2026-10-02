import { DataTypes, Model } from 'sequelize';
import { INCLUSION_TYPES } from '@nh/shared';
import { sequelize } from '../lib/db.js';
import { enumColumn, foreignKeyColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class PackageInclusion extends Model {}

PackageInclusion.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    type: enumColumn(INCLUSION_TYPES),
    text: { type: DataTypes.STRING(255), allowNull: false },
    sortOrder: sortOrderColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_inclusions' },
);
