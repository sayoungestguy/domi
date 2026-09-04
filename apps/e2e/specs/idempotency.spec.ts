import {
  API_URL,
  createHousehold,
  expect,
  sessionTokens,
  signIn,
  test,
} from '../fixtures/domi.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('retrying a shopping create with one idempotency key creates exactly one entry', async ({
  page,
  makeUser,
  request,
}) => {
  const owner = makeUser('Idempotency');
  await seedVerifiedUser(owner);
  await signIn(page, owner);
  await createHousehold(page, `Retry ${Date.now().toString().slice(-6)}`);
  const session = await sessionTokens(page);
  const authorization = { Authorization: `Bearer ${session.accessToken}` };
  const householdsResponse = await request.get(`${API_URL}/api/v1/households`, {
    headers: authorization,
  });
  expect(householdsResponse.ok()).toBeTruthy();
  const householdId = (await householdsResponse.json()).households[0].id as string;
  const endpoint = `${API_URL}/api/v1/households/${householdId}/shopping-list/entries`;
  const idempotencyKey = `e2e-create-${Date.now()}`;
  const options = {
    headers: { ...authorization, 'Idempotency-Key': idempotencyKey },
    data: { shoppingEntry: { name: 'Retry-safe eggs', quantity: 2 } },
  };

  const first = await request.post(endpoint, options);
  const retry = await request.post(endpoint, options);
  expect(first.status()).toBe(201);
  expect(retry.status()).toBe(200);
  const firstEntry = (await first.json()).entry;
  const retriedEntry = (await retry.json()).entry;
  expect(retriedEntry.id).toBe(firstEntry.id);

  const listResponse = await request.get(
    `${API_URL}/api/v1/households/${householdId}/shopping-list`,
    { headers: authorization },
  );
  expect(listResponse.ok()).toBeTruthy();
  const matchingEntries = (await listResponse.json()).shoppingList.entries.filter(
    (entry: { name: string }) => entry.name === 'Retry-safe eggs',
  );
  expect(matchingEntries).toHaveLength(1);
});
