import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../lib/db.js';
import { foreignKeyColumn, idColumn, sortOrderColumn, timestampColumns } from './columns.js';

export class PackageFaq extends Model {}

PackageFaq.init(
  {
    id: idColumn(),
    packageId: foreignKeyColumn(),
    question: { type: DataTypes.STRING(255), allowNull: false },
    answer: { type: DataTypes.TEXT, allowNull: false },
    sortOrder: sortOrderColumn(),
    ...timestampColumns,
  },
  { sequelize, tableName: 'package_faqs' },
);
