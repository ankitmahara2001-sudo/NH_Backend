import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { foreignKeyColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class PackageImage extends Model {}

PackageImage.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    url: { type: DataTypes.STRING(2048), allowNull: false },
    publicId: { type: DataTypes.STRING(255), allowNull: true },
    altText: { type: DataTypes.STRING(255), allowNull: true },
    width: { type: DataTypes.INTEGER, allowNull: true },
    height: { type: DataTypes.INTEGER, allowNull: true },
    sortOrder: sortOrderColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_images' },
);
