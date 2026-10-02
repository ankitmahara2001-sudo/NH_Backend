import bcrypt from 'bcryptjs';
import { AppError } from '../lib/AppError.js';
import { AdminUser } from '../models/index.js';

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

export function serializeAdmin(admin) {
  return { id: admin.id, name: admin.name, email: admin.email, lastLoginAt: admin.lastLoginAt };
}

export async function loginAdmin({ email, password }) {
  const admin = await AdminUser.scope('withPassword').findOne({ where: { email } });
  const passwordMatches = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
  }
  admin.lastLoginAt = new Date();
  await admin.save();
  return serializeAdmin(admin);
}

export async function findAdminById(id) {
  return AdminUser.findByPk(id);
}

export async function changeAdminPassword(adminId, { currentPassword, newPassword }) {
  const admin = await AdminUser.scope('withPassword').findByPk(adminId);
  if (!admin) throw AppError.unauthorized();
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw AppError.badRequest('Your current password is incorrect.', {
      currentPassword: 'Your current password is incorrect.',
    });
  }
  admin.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await admin.save();
}
