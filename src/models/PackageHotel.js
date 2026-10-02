import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { foreignKeyColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class PackageHotel extends Model {}

PackageHotel.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    name: { type: DataTypes.STRING(160), allowNull: false },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: true,
      // Postgres returns DECIMAL as a string; expose it as a number.
      get() {
        const raw = this.getDataValue('rating');
        return raw == null ? null : Number(raw);
      },
    },
    roomType: { type: DataTypes.STRING(120), allowNull: true },
    nights: { type: DataTypes.INTEGER, allowNull: true },
    amenities: { type: DataTypes.STRING(255), allowNull: true },
    imageUrl: { type: DataTypes.STRING(2048), allowNull: true },
    imagePublicId: { type: DataTypes.STRING(255), allowNull: true },
    sortOrder: sortOrderColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_hotels' },
);
