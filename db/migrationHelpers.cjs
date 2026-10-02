// Shared helpers for migrations. Kept outside migrations/ so sequelize-cli doesn't run it as a migration.

/** created_at / updated_at columns, matching `timestamps: true, underscored: true`. */
function timestamps(Sequelize) {
  return {
    created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
  };
}

/** Auto-increment integer primary key. */
function idColumn(Sequelize) {
  return { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false };
}

/** Foreign key column to `table`.id. */
function foreignKey(Sequelize, table, { allowNull = false, onDelete = 'CASCADE' } = {}) {
  return {
    type: Sequelize.INTEGER,
    allowNull,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete,
  };
}

/** Money in integer paise. Never use DECIMAL or FLOAT for money. */
function money(Sequelize, { allowNull = false, defaultValue } = {}) {
  return defaultValue === undefined
    ? { type: Sequelize.INTEGER, allowNull }
    : { type: Sequelize.INTEGER, allowNull, defaultValue };
}

/** Sequelize creates a Postgres type "enum_<table>_<column>" per ENUM column; dropTable leaves it behind. */
async function dropTableWithEnums(queryInterface, table, enumColumns = [], options = {}) {
  await queryInterface.dropTable(table, options);
  for (const column of enumColumns) {
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_${table}_${column}";`, options);
  }
}

/** Adds a plain index on each column (or column list). */
async function addIndexes(queryInterface, table, columns, options = {}) {
  for (const fields of columns) {
    await queryInterface.addIndex(table, Array.isArray(fields) ? fields : [fields], options);
  }
}

module.exports = { timestamps, idColumn, foreignKey, money, dropTableWithEnums, addIndexes };
