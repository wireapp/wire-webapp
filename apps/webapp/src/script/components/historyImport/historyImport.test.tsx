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

import {
  render,
  waitFor,
  type Matcher,
  type SelectorMatcherOptions,
  type waitForOptions,
  type MatcherOptions,
  type ByRoleMatcher,
  type ByRoleOptions,
} from '@testing-library/react';

import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {BackupRepository} from 'Repositories/backup/backupRepository';
import {User} from 'Repositories/entity/User';
import * as RootProvider from 'src/script/page/rootProvider';
import {RootContextValue} from 'src/script/page/rootProvider';
import * as BackupUtil from 'Util/backupUtil';
import * as Util from 'Util/util';

import {HistoryImport} from './historyImport';
import type {Container} from 'react-dom/client';
import type {OptionsReceived} from '@testing-library/dom/node_modules/pretty-format';

describe('HistoryImport', () => {
  const createFile = (content = 'backup', name = 'backup.wbu'): File => {
    return new File([content], name);
  };

  type SetupResult = {
    backupRepository: BackupRepository;
    file: File;
    switchContent: jest.Mock<any, any, any>;
    user: User;
    container: HTMLElement;
    baseElement: HTMLElement;
    debug: (
      baseElement?: Container | (Element | Document) | Array<Container | (Element | Document)> | undefined,
      maxLength?: number | undefined,
      options?: OptionsReceived | undefined,
    ) => void;
    rerender: (ui: React.ReactNode) => void;
    unmount: () => void;
    asFragment: () => DocumentFragment;
    getByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement;
    getAllByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    queryByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null;
    queryAllByLabelText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    findByLabelText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByLabelText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByPlaceholderText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByPlaceholderText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByPlaceholderText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement;
    getAllByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    queryByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement | null;
    queryAllByText: (id: Matcher, options?: SelectorMatcherOptions | undefined) => HTMLElement[];
    findByText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByText: (
      id: Matcher,
      options?: SelectorMatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByAltText: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByAltText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByAltText: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByTitle: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByTitle: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByTitle: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByDisplayValue: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByDisplayValue: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByDisplayValue: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement;
    getAllByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement[];
    queryByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement | null;
    queryAllByRole: (role: ByRoleMatcher, options?: ByRoleOptions | undefined) => HTMLElement[];
    findByRole: (
      role: ByRoleMatcher,
      options?: ByRoleOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByRole: (
      role: ByRoleMatcher,
      options?: ByRoleOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
    getByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement;
    getAllByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    queryByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement | null;
    queryAllByTestId: (id: Matcher, options?: MatcherOptions | undefined) => HTMLElement[];
    findByTestId: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement>;
    findAllByTestId: (
      id: Matcher,
      options?: MatcherOptions | undefined,
      waitForElementOptions?: waitForOptions | undefined,
    ) => Promise<HTMLElement[]>;
  };
  const setup = ({
    file = createFile(),
    isEncrypted = false,
  }: {file?: File; isEncrypted?: boolean} = {}): SetupResult => {
    const translate = jest.fn((translationKey: string) => {
      return translationKey;
    });

    jest.spyOn(RootProvider, 'useApplicationContext').mockImplementation(() => {
      return {
        translate,
      } as unknown as RootContextValue;
    });

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
