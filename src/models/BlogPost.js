import { DataTypes, Model } from 'sequelize';
import { BLOG_CATEGORIES, BLOG_STATUSES } from '../domain/enums.js';
import { sequelize } from '../lib/db.js';
import { enumColumn, flagColumn, foreignKeyColumn, idColumn, timestampColumns } from './columns.js';

export class BlogPost extends Model {}

BlogPost.init(
  {
    id: idColumn(),
    title: { type: DataTypes.STRING(200), allowNull: false },
    slug: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    category: enumColumn(BLOG_CATEGORIES),
    excerpt: { type: DataTypes.STRING(500), allowNull: false },
    // Sanitised HTML.
    content: { type: DataTypes.TEXT, allowNull: false },
    coverImageUrl: { type: DataTypes.STRING(2048), allowNull: true },
    coverImagePublicId: { type: DataTypes.STRING(255), allowNull: true },
    authorName: { type: DataTypes.STRING(120), allowNull: false },
    authorRole: { type: DataTypes.STRING(120), allowNull: true },
    readMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    relatedPackageId: foreignKeyColumn(true),
    isFeatured: flagColumn(false),
    status: { ...enumColumn(BLOG_STATUSES), defaultValue: 'draft' },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    ...timestampColumns,
  },
  { sequelize, tableName: 'blog_posts' },
);
