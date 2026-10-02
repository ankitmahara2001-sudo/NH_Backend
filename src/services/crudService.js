import { AppError } from '../lib/AppError.js';
import { destroyImages } from '../lib/cloudinary.js';
import { sequelize } from '../lib/db.js';

/**
 * Standard admin create/read/update/delete for one model.
 *
 * @param {object} config
 * @param {import('sequelize').ModelStatic<any>} config.model
 * @param {string} config.label            Singular name for messages, e.g. "Destination".
 * @param {Array} [config.order]           Default list order.
 * @param {string[]} [config.imageFields]  Columns holding Cloudinary public ids, cleaned up on change/delete.
 * @param {(input: object) => object} [config.prepare]  Adjusts validated input before saving.
 * @param {object} [config.listOptions]    Extra findAll options (attributes, include).
 * @param {(row) => object} [config.serialize]
 */
export function createCrudService({
  model,
  label,
  order = [['id', 'ASC']],
  imageFields = [],
  prepare = (input) => input,
  listOptions = {},
  serialize = (row) => row.get({ plain: true }),
}) {
  async function findOrFail(id, options = {}) {
    const row = await model.findByPk(id, options);
    if (!row) throw AppError.notFound(`${label} not found.`);
    return row;
  }

  const imageIds = (row) => imageFields.map((field) => row[field]).filter(Boolean);

  return {
    findOrFail,

    async list(where = {}) {
      const rows = await model.findAll({ where, order, ...listOptions });
      return rows.map(serialize);
    },

    async get(id) {
      return serialize(await findOrFail(id, listOptions));
    },

    async create(input) {
      const row = await model.create(await prepare(input));
      return serialize(await findOrFail(row.id, listOptions));
    },

    async update(id, input) {
      const row = await findOrFail(id);
      const before = imageIds(row);
      await row.update(await prepare(input, row));
      const after = new Set(imageIds(row));
      await destroyImages(before.filter((publicId) => !after.has(publicId)));
      return serialize(await findOrFail(id, listOptions));
    },

    async remove(id) {
      const row = await findOrFail(id);
      const images = imageIds(row);
      await row.destroy();
      await destroyImages(images);
    },

    /** Saves a new order: `ids` from first to last. */
    async reorder(ids) {
      await sequelize.transaction(async (transaction) => {
        for (const [index, id] of ids.entries()) {
          await model.update({ sortOrder: index + 1 }, { where: { id }, transaction });
        }
      });
    },
  };
}
