import { DataTypes } from 'sequelize';

// Column definitions reused by many models. They mirror db/migrationHelpers.cjs.

export const idColumn = () => ({
  type: DataTypes.INTEGER,
  autoIncrement: true,
  primaryKey: true,
});

export const foreignKeyColumn = (allowNull = false) => ({
  type: DataTypes.INTEGER,
  allowNull,
});

/** Money in integer paise. */
export const moneyColumn = (allowNull = false) => ({
  type: DataTypes.INTEGER,
  allowNull,
});

export const sortOrderColumn = () => ({
  type: DataTypes.INTEGER,
  allowNull: false,
  defaultValue: 0,
});

export const flagColumn = (defaultValue) => ({
  type: DataTypes.BOOLEAN,
  allowNull: false,
  defaultValue,
});

export const enumColumn = (values, allowNull = false) => ({
  type: DataTypes.ENUM(...values),
  allowNull,
});

// Filled by Sequelize on create/update and defaulted to NOW() by the migrations. Declared so
// Model.init knows the attributes; not marked NOT NULL here because join-table inserts
// (belongsToMany) are validated before Sequelize sets them.
export const timestampColumns = {
  createdAt: { type: DataTypes.DATE },
  updatedAt: { type: DataTypes.DATE },
};
