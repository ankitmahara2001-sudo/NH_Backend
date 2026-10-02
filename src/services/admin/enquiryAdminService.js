import { AppError } from '../../lib/AppError.js';
import { paginationMeta, toLimitOffset } from '../../lib/pagination.js';
import { Enquiry } from '../../models/index.js';

export async function listEnquiries({ status, page, pageSize }) {
  const { rows, count } = await Enquiry.findAndCountAll({
    where: status ? { status } : {},
    order: [['createdAt', 'DESC']],
    ...toLimitOffset(page, pageSize),
  });
  return { data: rows.map((row) => row.get({ plain: true })), meta: paginationMeta(page, pageSize, count) };
}

export async function updateEnquiryStatus(id, status) {
  const enquiry = await Enquiry.findByPk(id);
  if (!enquiry) throw AppError.notFound('Enquiry not found.');
  await enquiry.update({ status });
  return enquiry.get({ plain: true });
}
