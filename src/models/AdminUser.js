import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { idColumn, timestampColumns } from './columns.js';

export class AdminUser extends Model {}

AdminUser.init(
  {
    id: idColumn(),
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    ...timestampColumns,
  },
  {
    sequelize,
    tableName: 'admin_users',
    // Never send the hash anywhere by accident; use AdminUser.scope('withPassword') to read it.
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withPassword: {} },
  },
);
