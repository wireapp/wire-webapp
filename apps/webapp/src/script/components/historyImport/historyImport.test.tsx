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

import {render, waitFor} from '@testing-library/react';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {BackupRepository} from 'Repositories/backup/backupRepository';
import {User} from 'Repositories/entity/User';
import * as RootProvider from 'src/script/page/rootProvider';
import {RootContextValue} from 'src/script/page/rootProvider';
import * as BackupUtil from 'Util/backupUtil';
import * as Util from 'Util/util';

import {HistoryImport} from './historyImport';

describe('HistoryImport', () => {
  const createFile = (content = 'backup', name = 'backup.wbu') => new File([content], name);

  const setup = ({file = createFile(), isEncrypted = false}: {file?: File; isEncrypted?: boolean} = {}) => {
    const translate = jest.fn((translationKey: string) => translationKey);

    jest.spyOn(RootProvider, 'useApplicationContext').mockImplementation(
      () =>
        ({
          translate,
        }) as unknown as RootContextValue,
    );

    jest.spyOn(BackupUtil, 'checkBackupEncryption').mockResolvedValue(isEncrypted);
    jest.spyOn(Util, 'loadFileBuffer').mockResolvedValue(new ArrayBuffer(8));

    const backupRepository = {
      cancelAction: jest.fn(),
      importHistory: jest.fn().mockResolvedValue(undefined),
    } as unknown as BackupRepository;

    const user = {id: 'user-1'} as unknown as User;
    const switchContent = jest.fn();

    const view = render(
      <HistoryImport backupRepository={backupRepository} file={file} switchContent={switchContent} user={user} />,
    );

    return {
      ...view,
      backupRepository,
      file,
      switchContent,
      user,
    };
  };

  beforeEach(() => {
    removeCurrentModal();
  });

  afterEach(() => {
    removeCurrentModal();
    jest.restoreAllMocks();
  });

  it('uses a stable modal id for the password prompt', async () => {
    const showSpy = jest.spyOn(PrimaryModal, 'show');

    setup({isEncrypted: true});

    await waitFor(() => {
      expect(showSpy).toHaveBeenCalledTimes(1);
    });

    expect(showSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'history-import-password-modal',
      expect.any(Function),
    );
  });

  it('starts a fresh import when a new file is uploaded, but not when the same file re-renders', async () => {
    const {backupRepository, file, rerender, switchContent, user} = setup();

    await waitFor(() => {
      expect(backupRepository.importHistory).toHaveBeenCalledTimes(1);
    });

    rerender(
      <HistoryImport backupRepository={backupRepository} file={file} switchContent={switchContent} user={user} />,
    );

    await waitFor(() => {
      expect(backupRepository.importHistory).toHaveBeenCalledTimes(1);
    });

    const nextFile = createFile('backup-2', 'backup-2.wbu');

    rerender(
      <HistoryImport backupRepository={backupRepository} file={nextFile} switchContent={switchContent} user={user} />,
    );

    await waitFor(() => {
      expect(backupRepository.importHistory).toHaveBeenCalledTimes(2);
    });
  });
});
