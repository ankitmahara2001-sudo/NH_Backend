import {
  DEFAULT_BOOKING_PERCENT,
  DEFAULT_GST_PERCENT,
  PUBLIC_SETTING_KEYS,
  SETTING_KEYS,
  settingSchemas,
} from '@nh/shared';
import { Op } from 'sequelize';
import { AppError } from '../lib/AppError.js';
import { SiteSetting } from '../models/index.js';

/** Returns { key: value } for the requested keys. Missing keys are left out. */
export async function getSettings(keys = SETTING_KEYS, options = {}) {
  const rows = await SiteSetting.findAll({ where: { key: { [Op.in]: keys } }, ...options });
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function getSetting(key, options = {}) {
  const row = await SiteSetting.findOne({ where: { key }, ...options });
  return row ? row.value : null;
}

/** Every setting the public website may read (none of them hold secrets). */
export function getPublicSettings() {
  return getSettings(PUBLIC_SETTING_KEYS);
}

/** GST % and the default booking amount %, with safe fallbacks. */
export async function getPricingSettings(options = {}) {
  const values = await getSettings(['gst_percent', 'default_booking_percent'], options);
  return {
    gstPercent: values.gst_percent ?? DEFAULT_GST_PERCENT,
    defaultBookingPercent: values.default_booking_percent ?? DEFAULT_BOOKING_PERCENT,
  };
}

/** Validates the value with the key's schema and saves it. */
export async function updateSetting(key, value) {
  const schema = settingSchemas[key];
  if (!schema) throw AppError.notFound(`Unknown setting "${key}".`);
  const parsed = schema.parse(value);
  const [row] = await SiteSetting.upsert({ key, value: parsed }, { returning: true });
  return row.value;
}
