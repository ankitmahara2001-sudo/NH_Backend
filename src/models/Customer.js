import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { idColumn, timestampColumns } from './columns.js';

export class Customer extends Model {}

Customer.init(
  {
    id: idColumn(),
    name: { type: DataTypes.STRING(120), allowNull: true },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      set(value) {
        this.setDataValue('email', value.trim().toLowerCase());
      },
    },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'customers' },
);
