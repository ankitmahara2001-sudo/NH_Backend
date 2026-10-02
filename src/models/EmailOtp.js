import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { idColumn, timestampColumns } from './columns.js';

export class EmailOtp extends Model {}

EmailOtp.init(
  {
    id: idColumn(),
    email: { type: DataTypes.STRING(255), allowNull: false },
    // bcrypt hash of the 6-digit code; the code itself is never stored.
    codeHash: { type: DataTypes.STRING(255), allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    usedAt: { type: DataTypes.DATE, allowNull: true },
    requestIp: { type: DataTypes.STRING(64), allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'email_otps' },
);
