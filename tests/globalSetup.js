import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Rebuilds the test database (TEST_DATABASE_URL) from the real migrations and seeders before the
// test run, so tests always start from the same known data.
const API_DIR = fileURLToPath(new URL('..', import.meta.url));

export default function setup() {
  const run = (command) =>
    execSync(`npx sequelize-cli ${command} --env test`, { cwd: API_DIR, stdio: 'pipe' });
  try {
    run('db:migrate:undo:all');
    run('db:migrate');
    run('db:seed:all');
  } catch (error) {
    const details = error.stderr?.toString() || error.stdout?.toString() || error.message;
    throw new Error(
      `Could not prepare the test database. Check TEST_DATABASE_URL in api/.env and that PostgreSQL is running.\n${details}`,
    );
  }
}
