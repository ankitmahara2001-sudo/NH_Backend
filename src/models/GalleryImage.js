import { DataTypes, Model } from 'sequelize';
import { GALLERY_CATEGORIES } from '../domain/enums.js';
import { sequelize } from '../lib/db.js';
import { enumColumn, flagColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class GalleryImage extends Model {}

GalleryImage.init(
  {
    id: idColumn(),
    url: { type: DataTypes.STRING(2048), allowNull: false },
    publicId: { type: DataTypes.STRING(255), allowNull: true },
    caption: { type: DataTypes.STRING(255), allowNull: true },
    place: { type: DataTypes.STRING(120), allowNull: true },
    category: enumColumn(GALLERY_CATEGORIES),
    width: { type: DataTypes.INTEGER, allowNull: true },
    height: { type: DataTypes.INTEGER, allowNull: true },
    sortOrder: sortOrderColumn(),
    isActive: flagColumn(true),
    ...timestampColumns,
  },
  { sequelize, tableName: 'gallery_images' },
);
