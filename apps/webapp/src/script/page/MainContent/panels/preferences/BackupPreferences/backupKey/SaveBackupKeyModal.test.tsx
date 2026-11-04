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

import {act, fireEvent, render, waitFor} from '@testing-library/react';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {copyText} from 'Util/ClipboardUtil';
import {downloadBlob} from 'Util/util';

import {isValidBackupKey} from './BackupKey';
import {isBrowserPasswordManagerAvailable, saveToBrowserPasswordManager} from './browserPasswordManager';
import {SaveBackupKeyModal} from './SaveBackupKeyModal';
import {useBackupKeyStore} from './useBackupKeyStore';

jest.mock('Util/ClipboardUtil', () => ({
  copyText: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./browserPasswordManager', () => ({
  isBrowserPasswordManagerAvailable: jest.fn().mockReturnValue(false),
  saveToBrowserPasswordManager: jest.fn().mockResolvedValue(undefined),
}));

let mockOnePassword: {available: boolean; onSaveRequested?: () => void} = {available: false};
jest.mock('./OnePasswordSaveButton', () => ({
  OnePasswordSaveButton: ({
    onAvailabilityChange,
    onSaveRequested,
  }: {
    onAvailabilityChange: (isAvailable: boolean) => void;
    onSaveRequested: () => void;
  }) => {
    const {useEffect} = jest.requireActual('react');
    useEffect(() => {
      onAvailabilityChange(mockOnePassword.available);
      mockOnePassword.onSaveRequested = onSaveRequested;
    }, [onAvailabilityChange, onSaveRequested]);
    return null;
  },
}));

jest.mock('Util/util', () => ({
  ...jest.requireActual('Util/util'),
  downloadBlob: jest.fn(),
}));

const CREDENTIAL_ID = 'Wire backup key · kim@example.com';

const renderModal = (onClose = jest.fn()) =>
  render(withTheme(<SaveBackupKeyModal credentialId={CREDENTIAL_ID} onClose={onClose} />));

describe('SaveBackupKeyModal', () => {
  beforeEach(() => {
    useBackupKeyStore.getState().clearKey();
    jest.clearAllMocks();
    (isBrowserPasswordManagerAvailable as jest.Mock).mockReturnValue(false);
    mockOnePassword = {available: false};
  });

  it('shows an error when continuing without saving the key', () => {
    const onClose = jest.fn();
    const {getByTestId} = renderModal(onClose);

    fireEvent.click(getByTestId('do-continue-backup-key'));

    expect(getByTestId('backup-key-error')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(useBackupKeyStore.getState().key).toBeUndefined();
  });

  it('copies a valid key and marks it as saved', async () => {
    const {getByTestId, getByText} = renderModal();

    fireEvent.click(getByTestId('do-copy-backup-key'));

    await waitFor(() => expect(getByText('preferencesBackupKeyCopied')).not.toBeNull());
    const copiedKey = (copyText as jest.Mock).mock.calls[0][0];
    expect(isValidBackupKey(copiedKey)).toBe(true);
    expect((getByTestId('backup-key-saved-checkbox') as HTMLInputElement).checked).toBe(true);
  });

  it('downloads the key file and stores the same key on continue', () => {
    const onClose = jest.fn();
    const {getByTestId} = renderModal(onClose);

    fireEvent.click(getByTestId('do-download-backup-key'));
    fireEvent.click(getByTestId('do-continue-backup-key'));

    const [, fileName] = (downloadBlob as jest.Mock).mock.calls[0];
    expect(fileName).toBe('wire-backup-key.txt');
    expect(onClose).toHaveBeenCalled();
    expect(isValidBackupKey(useBackupKeyStore.getState().key ?? '')).toBe(true);
  });

  it('stores the key when skipping anyway', () => {
    const onClose = jest.fn();
    const {getByTestId} = renderModal(onClose);

    fireEvent.click(getByTestId('do-skip-backup-key'));
    fireEvent.click(getByTestId('do-skip-backup-key-anyway'));

    expect(onClose).toHaveBeenCalled();
    expect(useBackupKeyStore.getState().key).toBeDefined();
  });

  it('goes back to the save step from the skip warning', () => {
    const {getByTestId, queryByTestId} = renderModal();

    fireEvent.click(getByTestId('do-skip-backup-key'));
    expect(queryByTestId('do-copy-backup-key')).toBeNull();

    fireEvent.click(getByTestId('do-back-to-backup-key'));
    expect(getByTestId('do-copy-backup-key')).not.toBeNull();
  });

  it('discards the pending key when closed', () => {
    useBackupKeyStore.getState().setKey('existing key');
    const onClose = jest.fn();
    const {getByTestId} = renderModal(onClose);

    fireEvent.click(getByTestId('do-download-backup-key'));
    fireEvent.click(getByTestId('do-close'));

    expect(onClose).toHaveBeenCalled();
    expect(useBackupKeyStore.getState().key).toBe('existing key');
  });

  it('closes with Escape without storing the key', () => {
    const onClose = jest.fn();
    renderModal(onClose);

    expect(document.activeElement?.getAttribute('data-uie-name')).toBe('do-copy-backup-key');
    fireEvent.keyDown(document.activeElement!, {key: 'Escape'});

    expect(onClose).toHaveBeenCalled();
    expect(useBackupKeyStore.getState().key).toBeUndefined();
  });

  describe('password manager', () => {
    const isPasswordManagerVisible = (element: HTMLElement) => getComputedStyle(element).display !== 'none';

    it('is hidden when no password manager is available', () => {
      const {getByTestId} = renderModal();

      expect(isPasswordManagerVisible(getByTestId('backup-key-password-manager'))).toBe(false);
      expect(document.activeElement?.getAttribute('data-uie-name')).toBe('do-copy-backup-key');
    });

    it('saves to the browser password manager without marking the key as saved', async () => {
      (isBrowserPasswordManagerAvailable as jest.Mock).mockReturnValue(true);
      const {getByTestId} = renderModal();

      expect(isPasswordManagerVisible(getByTestId('backup-key-password-manager'))).toBe(true);
      expect(document.activeElement?.getAttribute('data-uie-name')).toBe('do-save-backup-key-password-manager');

      fireEvent.click(getByTestId('do-save-backup-key-password-manager'));

      await waitFor(() =>
        expect(getByTestId('backup-key-password-manager-status').textContent).toBe(
          'preferencesBackupKeyPasswordManagerPrompt',
        ),
      );
      const [credentialId, key] = (saveToBrowserPasswordManager as jest.Mock).mock.calls[0];
      expect(credentialId).toBe(CREDENTIAL_ID);
      expect(isValidBackupKey(key)).toBe(true);
      // The browser doesn't tell whether the user accepted its prompt
      expect((getByTestId('backup-key-saved-checkbox') as HTMLInputElement).checked).toBe(false);
    });

    it('shows an error when the browser password manager fails', async () => {
      (isBrowserPasswordManagerAvailable as jest.Mock).mockReturnValue(true);
      (saveToBrowserPasswordManager as jest.Mock).mockRejectedValueOnce(new Error('NotAllowedError'));
      const {getByTestId} = renderModal();

      fireEvent.click(getByTestId('do-save-backup-key-password-manager'));

      await waitFor(() =>
        expect(getByTestId('backup-key-password-manager-status').textContent).toBe(
          'preferencesBackupKeyPasswordManagerError',
        ),
      );
    });

    it('shows the 1Password option when the extension enables it, without marking the key as saved', async () => {
      mockOnePassword = {available: true};
      const {getByTestId} = renderModal();

      await waitFor(() => expect(isPasswordManagerVisible(getByTestId('backup-key-password-manager'))).toBe(true));
      act(() => mockOnePassword.onSaveRequested?.());

      expect(getByTestId('backup-key-password-manager-status').textContent).toBe(
        'preferencesBackupKeyPasswordManagerPrompt',
      );
      // 1Password doesn't report back whether the item was saved
      expect((getByTestId('backup-key-saved-checkbox') as HTMLInputElement).checked).toBe(false);
    });
  });
});
