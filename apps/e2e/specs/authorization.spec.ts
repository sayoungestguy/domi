import {
  API_URL,
  createHousehold,
  expect,
  sessionTokens,
  signIn,
  test,
} from '../fixtures/domi.js';
import { seedVerifiedUser } from '../scripts/users.js';

test('outsider receives neither household REST data nor its cable stream', async ({
  browser,
  makeUser,
  request,
}) => {
  const owner = makeUser('PrivateOwner');
  const outsider = makeUser('Outsider');
  await Promise.all([seedVerifiedUser(owner), seedVerifiedUser(outsider)]);

  const ownerContext = await browser.newContext();
  const outsiderContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const outsiderPage = await outsiderContext.newPage();
  try {
    await signIn(ownerPage, owner);
    await createHousehold(ownerPage, `Private ${Date.now().toString().slice(-6)}`);
    const ownerSession = await sessionTokens(ownerPage);
    const households = await request.get(`${API_URL}/api/v1/households`, {
      headers: { Authorization: `Bearer ${ownerSession.accessToken}` },
    });
    const householdId = (await households.json()).households[0].id as string;

    await signIn(outsiderPage, outsider);
    const outsiderSession = await sessionTokens(outsiderPage);
    const denied = await request.get(`${API_URL}/api/v1/households/${householdId}`, {
      headers: { Authorization: `Bearer ${outsiderSession.accessToken}` },
    });
    expect(denied.status()).toBe(404);
    await expect(denied.json()).resolves.toMatchObject({ error: { code: 'resource.not_found' } });

    const cableResult = await outsiderPage.evaluate(
      ({ token, householdId, cableURL }) =>
        new Promise<string>((resolve, reject) => {
          const socket = new WebSocket(cableURL, ['actioncable-v1-json', 'actioncable-unsupported']);
          const timeout = setTimeout(() => reject(new Error('Cable did not respond.')), 5_000);
          socket.onmessage = (event) => {
            const message = JSON.parse(String(event.data));
            if (message.type === 'welcome') {
              socket.send(
                JSON.stringify({
                  command: 'subscribe',
                  identifier: JSON.stringify({ channel: 'HouseholdChannel', householdId, token }),
                }),
              );
            }
            if (message.type === 'reject_subscription') {
              clearTimeout(timeout);
              socket.close();
              resolve(message.type);
            }
          };
          socket.onerror = () => reject(new Error('Cable connection failed.'));
        }),
      {
        token: outsiderSession.accessToken,
        householdId,
        cableURL: API_URL.replace(/^http/, 'ws') + '/cable',
      },
    );
    expect(cableResult).toBe('reject_subscription');
  } finally {
    await ownerContext.close();
    await outsiderContext.close();
  }
});
