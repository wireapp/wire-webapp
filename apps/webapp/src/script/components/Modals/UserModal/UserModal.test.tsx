/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {act, render, waitFor} from '@testing-library/react';
import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import en from 'I18n/en-US.json';
import {ConnectionEntity} from 'Repositories/connection/connectionEntity';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserRepository} from 'Repositories/user/userRepository';
import {Config} from 'src/script/Config';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {setStrings, translate} from 'Util/localizerUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {Core} from 'src/script/service/coreSingleton';

import {UserModal, UserModalProps} from './UserModal';
import {showUserModal, useUserModalState} from './UserModal.state';

describe('UserModal', () => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );
  const legacyTranslationRootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate}),
  );
  const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      isFeatureToggleEnabled(featureName): boolean {
        return featureName === reactTranslationRenderingFeatureToggleName;
      },
      translate,
    }),
  );

  type TranslationTestFunction = () => void | Promise<void>;
  type IsolatedTranslationTestFunction = () => Promise<void>;
  const legalHoldBlockUrl = 'https://support.example/legal-hold-block';

  function withTranslationStrings(
    strings: typeof en,
    testFunction: TranslationTestFunction,
  ): IsolatedTranslationTestFunction {
    return async function runTranslationTest(): Promise<void> {
      setStrings({en: strings});

      try {
        await testFunction();
      } finally {
        act((): void => {
          useUserModalState.getState().resetState();
        });
        setStrings({en});
      }
    };
  }

  function withLegalHoldConfiguration(testFunction: TranslationTestFunction): IsolatedTranslationTestFunction {
    return async function runLegalHoldConfigurationTest(): Promise<void> {
      const originalConfig = Config.getConfig();
      const configWithTestValues = {
        ...originalConfig,
        URL: {
          ...originalConfig.URL,
          SUPPORT: {
            ...originalConfig.URL.SUPPORT,
            LEGAL_HOLD_BLOCK: legalHoldBlockUrl,
          },
        },
      };
      const configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue(configWithTestValues);

      try {
        await testFunction();
      } finally {
        configSpy.mockRestore();
      }
    };
  }

  function createUser(isBlockedForLegalHold: boolean): User {
    const user = new User('mock-id', '', translateForTest);
    user.name('Test User');

    if (isBlockedForLegalHold) {
      const connection = new ConnectionEntity();
      connection.status(ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT);
      user.connection(connection);
    }

    return user;
  }

  function createUserModalProps(user: User): UserModalProps {
    return {
      core: {} as Core,
      teamState: {} as TeamState,
      userRepository: {
        refreshUser: jest.fn(async (): Promise<User> => {
          return user;
        }),
      } as unknown as UserRepository,
      selfUser: new User('', '', translateForTest),
    };
  }

  function showTestUserModal(user: User): void {
    act((): void => {
      showUserModal(user.qualifiedId);
    });
  }

  it('correctly fetches user from user repository', async () => {
    jest.useFakeTimers();
    const refreshUser = jest.fn(async (id: QualifiedId) => {
      return new User('mock-id', 'test-domain.mock', translateForTest);
    });

    const props: UserModalProps = {
      core: {} as Core,
      teamState: {} as TeamState,
      userRepository: {
        refreshUser,
      } as unknown as UserRepository,
      selfUser: new User('', '', translateForTest),
    };
    showUserModal({domain: 'test-domain.mock', id: 'mock-id'});
    const {getByTestId} = render(<UserModal {...props} />, {wrapper: rootProviderWrapper});
    await waitFor(() => getByTestId('do-close'));

    expect(refreshUser).toHaveBeenCalledTimes(1);
  });

  it('shows user not found when user is deleted', async () => {
    jest.useFakeTimers();
    const refreshUser = jest.fn(async (id: QualifiedId) => {
      const user = new User('mock-id', 'test-domain.mock', translateForTest);
      user.isDeleted = true;
      return user;
    });

    const props: UserModalProps = {
      core: {} as Core,
      teamState: {} as TeamState,
      userRepository: {
        refreshUser,
      } as unknown as UserRepository,
      selfUser: new User('', '', translateForTest),
    };

    showUserModal({domain: 'test-domain.mock', id: 'mock-id'});

    const {getByTestId} = render(<UserModal {...props} />, {wrapper: rootProviderWrapper});

    expect(refreshUser).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(getByTestId('status-modal-text')).toBeInstanceOf(HTMLDivElement);
    });
  });

  it(
    'preserves the blocked Legal Hold message in the legacy HTML path',
    withLegalHoldConfiguration(
      withTranslationStrings(
        {...en, modalUserBlockedForLegalHold: 'Blocked: [link]Learn more[/link]'},
        async (): Promise<void> => {
          const user = createUser(true);
          const {getByTestId} = render(
            withThemeAndRootContext(
              <UserModal {...createUserModalProps(user)} />,
              legacyTranslationRootProviderWrapper,
            ),
          );
          showTestUserModal(user);

          const blockedMessage = await waitFor((): HTMLElement => {
            return getByTestId('status-blocked-legal-hold');
          });

          expect(blockedMessage).toHaveTextContent('Blocked: Learn more');
          expect(blockedMessage.querySelector('a')).toHaveAttribute(
            'href',
            Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK,
          );
        },
      ),
    ),
  );

  it(
    'renders the blocked Legal Hold message as a React link when enabled',
    withLegalHoldConfiguration(
      withTranslationStrings(
        {...en, modalUserBlockedForLegalHold: 'Blocked: [link]Read about Legal Hold[/link]'},
        async (): Promise<void> => {
          const user = createUser(true);
          const {getByTestId} = render(
            withThemeAndRootContext(
              <UserModal {...createUserModalProps(user)} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );
          showTestUserModal(user);

          const blockedMessage = await waitFor((): HTMLElement => {
            return getByTestId('status-blocked-legal-hold');
          });
          const blockedMessageLink = blockedMessage.querySelector('a');

          expect(blockedMessageLink).toBeInTheDocument();
          expect(blockedMessageLink).toHaveTextContent('Read about Legal Hold');
          expect(blockedMessageLink).toHaveAttribute('href', Config.getConfig().URL.SUPPORT.LEGAL_HOLD_BLOCK);
          expect(blockedMessageLink).toHaveAttribute('target', '_blank');
          expect(blockedMessageLink).toHaveAttribute('rel', 'nofollow noopener noreferrer');
          expect(blockedMessageLink).toHaveAttribute('data-uie-name', 'read-more-legal-hold');
        },
      ),
    ),
  );

  it(
    'keeps the blocked Legal Hold link placement under translation control',
    withLegalHoldConfiguration(
      withTranslationStrings(
        {...en, modalUserBlockedForLegalHold: '[link]Read about Legal Hold[/link] This user is blocked.'},
        async (): Promise<void> => {
          const user = createUser(true);
          const {getByTestId} = render(
            withThemeAndRootContext(
              <UserModal {...createUserModalProps(user)} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );
          showTestUserModal(user);

          const blockedMessage = await waitFor((): HTMLElement => {
            return getByTestId('status-blocked-legal-hold');
          });

          expect(blockedMessage.firstElementChild).toBeInstanceOf(HTMLAnchorElement);
          expect(blockedMessage).toHaveTextContent('Read about Legal Hold This user is blocked.');
        },
      ),
    ),
  );

  it(
    'leaves unsupported blocked Legal Hold markup as text',
    withLegalHoldConfiguration(
      withTranslationStrings(
        {...en, modalUserBlockedForLegalHold: 'Before[link]<img src="example">Read[/link]After'},
        async (): Promise<void> => {
          const user = createUser(true);
          const {getByTestId} = render(
            withThemeAndRootContext(
              <UserModal {...createUserModalProps(user)} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );
          showTestUserModal(user);

          const blockedMessage = await waitFor((): HTMLElement => {
            return getByTestId('status-blocked-legal-hold');
          });

          expect(blockedMessage).toHaveTextContent('Before<img src="example">ReadAfter');
          expect(blockedMessage.querySelector('img')).toBeNull();
        },
      ),
    ),
  );

  it('renders normal UserActions for users who are not blocked for Legal Hold', async (): Promise<void> => {
    try {
      const user = createUser(false);
      const {getByTestId, queryByTestId} = render(
        withThemeAndRootContext(<UserModal {...createUserModalProps(user)} />, rootProviderWrapper),
      );
      showTestUserModal(user);

      await waitFor((): HTMLElement => {
        return getByTestId('do-send-request');
      });

      expect(queryByTestId('status-blocked-legal-hold')).toBeNull();
      expect(getByTestId('do-send-request')).toBeInTheDocument();
    } finally {
      act((): void => {
        useUserModalState.getState().resetState();
      });
    }
  });
});
