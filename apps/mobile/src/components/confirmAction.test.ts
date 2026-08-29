import { Alert, Platform } from 'react-native';

import { confirmAction } from './confirmAction';

jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

afterEach(() => {
  jest.restoreAllMocks();
});

test('uses the browser confirmation result on web', async () => {
  jest.replaceProperty(Platform, 'OS', 'web');
  const confirm = jest.fn(() => true);
  Object.defineProperty(globalThis, 'confirm', { configurable: true, value: confirm });

  await expect(
    confirmAction({ title: 'Finish?', message: 'This is durable.', confirmLabel: 'Finish' }),
  ).resolves.toBe(true);
  expect(confirm).toHaveBeenCalledWith('Finish?\n\nThis is durable.');
  expect(Alert.alert).not.toHaveBeenCalled();
  Reflect.deleteProperty(globalThis, 'confirm');
});

test('uses the native alert callbacks off web', async () => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.[1]?.onPress?.();
  });

  await expect(
    confirmAction({
      title: 'Archive?',
      message: 'The item will be hidden.',
      confirmLabel: 'Archive',
      destructive: true,
    }),
  ).resolves.toBe(true);
  expect(alert.mock.calls[0]?.[2]?.[1]?.style).toBe('destructive');
});
