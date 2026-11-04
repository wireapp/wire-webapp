/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {fireEvent, render} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {User} from 'Repositories/entity/User';

import {BackupPreferences} from './BackupPreferences';
import {mockBackupPreferencesState} from './BackupPreferences.mock';
import {BackupPreferencesViewState} from './BackupPreferences.types';
import {useBackupKeyStore} from './backupKey/useBackupKeyStore';

jest.mock('./backupKey/OnePasswordSaveButton', () => ({
  OnePasswordSaveButton: () => null,
}));

const renderWithState = (overrides: Partial<BackupPreferencesViewState> = {}) =>
  render(
    withTheme(
      <BackupPreferences
        selfUser={new User('user-id', 'wire.com')}
        state={{...mockBackupPreferencesState, ...overrides}}
      />,
    ),
  );

describe('BackupPreferences', () => {
  beforeEach(() => {
    useBackupKeyStore.getState().clearKey();
  });

  it('renders all sections when automatic backups are on', () => {
    const {getByText, getByTestId, queryByTestId} = renderWithState();

    expect(getByText('preferencesBackupAutomaticTitle')).not.toBeNull();
    expect(getByTestId('backup-status-line').textContent).toBe('preferencesBackupStatusWeekly');
    expect(getByTestId('backup-summary')).not.toBeNull();
    expect(getByTestId('do-backup-now')).not.toBeNull();
    expect(getByTestId('backup-schedule')).not.toBeNull();
    expect(getByTestId('backup-location-path').textContent).toBe(mockBackupPreferencesState.location);
    expect(getByTestId('backup-key')).not.toBeNull();
    expect(getByTestId('do-restore-from-file')).not.toBeNull();

    expect(queryByTestId('backup-paused-banner')).toBeNull();
    expect(queryByTestId('backup-admin-banner')).toBeNull();
  });

  it('hides schedule and location when automatic backups are off', () => {
    const {getByTestId, queryByTestId} = renderWithState({autoBackupEnabled: false});

    expect(getByTestId('backup-status-line').textContent).toBe('preferencesBackupStatusOff');
    expect(queryByTestId('backup-schedule')).toBeNull();
    expect(queryByTestId('backup-location')).toBeNull();
    expect(getByTestId('do-restore-from-file')).not.toBeNull();
  });

  it('shows schedule and location after turning automatic backups on', () => {
    const {getByTestId, queryByTestId} = renderWithState({autoBackupEnabled: false});

    fireEvent.click(getByTestId('backup-auto-toggle'));

    expect(queryByTestId('backup-schedule')).not.toBeNull();
    expect(queryByTestId('backup-location')).not.toBeNull();
  });

  it('updates the status line when the schedule changes', () => {
    const {getByTestId} = renderWithState();

    fireEvent.click(getByTestId('backup-frequency-daily'));

    expect(getByTestId('backup-status-line').textContent).toBe('preferencesBackupStatusDaily');
  });

  it('locks toggle and schedule when enforced by the team admin', () => {
    const {getByTestId} = renderWithState({adminEnforced: true});

    expect(getByTestId('backup-admin-banner')).not.toBeNull();
    expect(getByTestId('backup-schedule-admin')).not.toBeNull();
    expect((getByTestId('backup-auto-toggle') as HTMLInputElement).disabled).toBe(true);
    expect((getByTestId('backup-frequency-daily') as HTMLInputElement).disabled).toBe(true);
  });

  it('shows the paused banner when the backup folder is not accessible', () => {
    const {getByTestId} = renderWithState({paused: true});

    expect(getByTestId('backup-paused-banner')).not.toBeNull();
    expect(getByTestId('backup-status-line').textContent).toBe('preferencesBackupStatusPaused');
  });

  it('shows progress and cancel while a backup runs', () => {
    const {getByTestId, queryByTestId} = renderWithState({run: {kind: 'backup', progress: 42}});

    expect(getByTestId('backup-progress').textContent).toContain('42%');
    expect(getByTestId('do-cancel-backup')).not.toBeNull();
    expect(queryByTestId('do-backup-now')).toBeNull();
    expect(queryByTestId('backup-summary')).toBeNull();
    expect((getByTestId('do-restore-from-file') as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers to generate a key when there is none', () => {
    const {getByTestId, queryByTestId} = renderWithState();

    expect(queryByTestId('do-create-backup-key')).toBeNull();
    fireEvent.click(getByTestId('do-generate-backup-key'));

    expect(getByTestId('backup-key-modal')).not.toBeNull();
  });

  it('asks for confirmation before creating a new key', () => {
    const showSpy = jest.spyOn(PrimaryModal, 'show').mockImplementation(() => undefined);
    useBackupKeyStore.getState().setKey('existing key');
    const {getByTestId, queryByTestId} = renderWithState();

    expect(queryByTestId('do-generate-backup-key')).toBeNull();
    fireEvent.click(getByTestId('do-create-backup-key'));

    expect(showSpy).toHaveBeenCalledWith(PrimaryModal.type.CONFIRM, expect.anything());
    expect(queryByTestId('backup-key-modal')).toBeNull();
    showSpy.mockRestore();
  });
});
