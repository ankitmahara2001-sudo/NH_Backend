import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { flagColumn, foreignKeyColumn, idColumn, timestampColumns } from './columns.js';

export class PackageDeparture extends Model {}

PackageDeparture.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    // YYYY-MM-DD
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    // NULL = unlimited seats.
    totalSeats: { type: DataTypes.INTEGER, allowNull: true },
    bookedSeats: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // Website sales stop when bookedSeats reaches this (see src/domain/seats.js). NULL = no cap.
    onlineSeatCap: { type: DataTypes.INTEGER, allowNull: true },
    isActive: flagColumn(true),
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_departures' },
);
