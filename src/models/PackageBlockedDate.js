import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { foreignKeyColumn, idColumn, timestampColumns } from './columns.js';

export class PackageBlockedDate extends Model {}

PackageBlockedDate.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    // YYYY-MM-DD, both ends inclusive.
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.STRING(160), allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_blocked_dates' },
);
