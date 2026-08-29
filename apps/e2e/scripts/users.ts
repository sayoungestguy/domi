import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { TestUser } from '../fixtures/domi.js';

const execFileAsync = promisify(execFile);
const databaseURL = 'postgresql://domi:domi_local_only@postgres:5432/domi_e2e';

export async function seedVerifiedUser(user: TestUser): Promise<void> {
  const runner = [
    'User.create!(',
    'email: ENV.fetch("E2E_EMAIL"),',
    'display_name: ENV.fetch("E2E_DISPLAY_NAME"),',
    'password: ENV.fetch("E2E_PASSWORD"),',
    'password_confirmation: ENV.fetch("E2E_PASSWORD"),',
    'email_verified_at: Time.current)',
  ].join(' ');

  await execFileAsync(
    'docker',
    [
      'compose',
      'run',
      '--rm',
      '-e',
      `DATABASE_URL=${databaseURL}`,
      '-e',
      'RAILS_ENV=development',
      '-e',
      `E2E_EMAIL=${user.email}`,
      '-e',
      `E2E_DISPLAY_NAME=${user.displayName}`,
      '-e',
      `E2E_PASSWORD=${user.password}`,
      'api',
      'bin/rails',
      'runner',
      runner,
    ],
    { cwd: new URL('../../..', import.meta.url), maxBuffer: 1_000_000 },
  );
}
