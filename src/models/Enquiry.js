import { DataTypes, Model } from 'sequelize';
import { ENQUIRY_STATUSES } from '../domain/enums.js';
import { sequelize } from '../lib/db.js';
import { enumColumn, idColumn, timestampColumns } from './columns.js';

export class Enquiry extends Model {}

Enquiry.init(
  {
    id: idColumn(),
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    destination: { type: DataTypes.STRING(120), allowNull: true },
    travellers: { type: DataTypes.STRING(40), allowNull: true },
    travelMonth: { type: DataTypes.STRING(40), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    status: { ...enumColumn(ENQUIRY_STATUSES), defaultValue: 'new' },
    ...timestampColumns,
  },
  { sequelize, tableName: 'enquiries' },
);
