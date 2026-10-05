import { DataTypes, Model } from 'sequelize';
import { GENDERS } from '../domain/enums.js';
import { sequelize } from '../lib/db.js';
import { enumColumn, flagColumn, foreignKeyColumn, idColumn, timestampColumns } from './columns.js';

export class BookingTraveller extends Model {}

BookingTraveller.init(
  {
    id: idColumn(),
    bookingId: foreignKeyColumn(),
    fullName: { type: DataTypes.STRING(120), allowNull: false },
    age: { type: DataTypes.INTEGER, allowNull: false },
    gender: enumColumn(GENDERS),
    isLead: flagColumn(false),
    ...timestampColumns,
  },
  { sequelize, tableName: 'booking_travellers' },
);
