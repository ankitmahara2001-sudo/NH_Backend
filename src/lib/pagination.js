/** Sequelize limit/offset for a 1-based page. */
export function toLimitOffset(page, pageSize) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

/** The `meta` object of a paginated response. */
export function paginationMeta(page, pageSize, total) {
  return { page, pageSize, total };
}
