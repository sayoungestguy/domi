import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import {
  deleteAccount,
  deleteHousehold,
  getAccountExport,
  getHouseholdExport,
} from '../../api/privacy';
import type { Household } from '../../api/types';
import { confirmAction } from '../../components/confirmAction';
import { PrivacyControls } from './PrivacyControls';

jest.mock('../../api/privacy');
jest.mock('../../components/confirmAction');

const household: Household = {
  id: 'household-1',
  name: 'Home',
  timezone: 'Etc/UTC',
  role: 'owner',
  version: 0,
  createdAt: '2026-08-01T00:00:00Z',
};

const accountExportMock = getAccountExport as jest.MockedFunction<typeof getAccountExport>;
const householdExportMock = getHouseholdExport as jest.MockedFunction<typeof getHouseholdExport>;
const deleteHouseholdMock = deleteHousehold as jest.MockedFunction<typeof deleteHousehold>;
const deleteAccountMock = deleteAccount as jest.MockedFunction<typeof deleteAccount>;
const confirmMock = confirmAction as jest.MockedFunction<typeof confirmAction>;

beforeEach(() => {
  jest.clearAllMocks();
  accountExportMock.mockResolvedValue({ export: { schemaVersion: 1, account: { id: 'user-1' } } });
  householdExportMock.mockResolvedValue({ export: { schemaVersion: 1, household: { id: household.id } } });
  deleteHouseholdMock.mockResolvedValue(undefined);
  deleteAccountMock.mockResolvedValue(undefined);
  confirmMock.mockResolvedValue(true);
  jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
});

test('shares portable account and owner household exports', async () => {
  await render(
    <PrivacyControls household={household} onAccountDeleted={jest.fn()} onHouseholdDeleted={jest.fn()} />,
  );

  await fireEvent.press(screen.getByText('Export my account data'));
  await waitFor(() => expect(accountExportMock).toHaveBeenCalled());
  expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ title: 'Domi account export' }));

  await fireEvent.press(screen.getByText('Export household data'));
  await waitFor(() => expect(householdExportMock).toHaveBeenCalledWith(household.id));
});

test('requires the exact household name before permanent deletion', async () => {
  const onDeleted = jest.fn().mockResolvedValue(undefined);
  await render(
    <PrivacyControls household={household} onAccountDeleted={jest.fn()} onHouseholdDeleted={onDeleted} />,
  );

  const confirmation = screen.getByLabelText('Type household name to delete');
  await fireEvent.changeText(confirmation, 'Wrong');
  expect(screen.getByText('Enter Home exactly.')).toBeTruthy();
  expect(confirmation.props['aria-invalid']).toBe(true);

  await fireEvent.changeText(confirmation, 'Home');
  await fireEvent.press(screen.getByText('Delete household permanently'));
  await waitFor(() => expect(deleteHouseholdMock).toHaveBeenCalledWith(household.id, 'Home'));
  expect(onDeleted).toHaveBeenCalled();
});

test('requires password and exact account phrase before erasing the account', async () => {
  const onDeleted = jest.fn().mockResolvedValue(undefined);
  await render(
    <PrivacyControls household={household} onAccountDeleted={onDeleted} onHouseholdDeleted={jest.fn()} />,
  );

  await fireEvent.changeText(screen.getByLabelText('Current password'), 'correct password');
  await fireEvent.changeText(screen.getByLabelText('Type DELETE MY ACCOUNT'), 'delete');
  expect(screen.getByText('Enter DELETE MY ACCOUNT exactly.')).toBeTruthy();

  await fireEvent.changeText(screen.getByLabelText('Type DELETE MY ACCOUNT'), 'DELETE MY ACCOUNT');
  await fireEvent.press(screen.getByText('Delete my account permanently'));
  await waitFor(() =>
    expect(deleteAccountMock).toHaveBeenCalledWith('correct password', 'DELETE MY ACCOUNT'),
  );
  expect(onDeleted).toHaveBeenCalled();
});
