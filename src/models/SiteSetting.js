import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { idColumn, timestampColumns } from './columns.js';

/** Key -> JSON value. Each key's shape is defined by `settingSchemas` in @nh/shared. */
export class SiteSetting extends Model {}

SiteSetting.init(
  {
    id: idColumn(),
    key: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    value: { type: DataTypes.JSONB, allowNull: false },
    ...timestampColumns,
  },
  { sequelize, tableName: 'site_settings' },
);
