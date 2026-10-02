import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { flagColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class HeroSlide extends Model {}

HeroSlide.init(
  {
    id: idColumn(),
    title: { type: DataTypes.STRING(120), allowNull: false },
    region: { type: DataTypes.STRING(120), allowNull: false },
    caption: { type: DataTypes.STRING(255), allowNull: true },
    imageUrl: { type: DataTypes.STRING(2048), allowNull: false },
    imagePublicId: { type: DataTypes.STRING(255), allowNull: true },
    linkUrl: { type: DataTypes.STRING(2048), allowNull: true },
    sortOrder: sortOrderColumn(),
    isActive: flagColumn(true),
    ...timestampColumns,
  },
  { sequelize, tableName: 'hero_slides' },
);
