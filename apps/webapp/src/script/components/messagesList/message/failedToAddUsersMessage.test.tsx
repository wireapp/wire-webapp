/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {act, render} from '@testing-library/react';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {AddUsersFailure, AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import {StyledApp, THEME_ID} from '@wireapp/react-ui-kit';

import en from 'I18n/en-US.json';
import {FailedToAddUsersMessage as FailedToAddUsersMessageEntity} from 'Repositories/entity/message/failedToAddUsersMessage';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/userState';
import {generateQualifiedIds} from 'src/script/auth/util/test/testUtil';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import {FailedToAddUsersMessage} from './failedToAddUsersMessage';
import {translateForTest} from 'Util/test/translateForTest';

setStrings({en});
const legacyRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));
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

function withTranslationStrings(
  strings: typeof en,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runTranslationTest(): Promise<void> {
    setStrings({en: strings});

    try {
      await testFunction();
    } finally {
      setStrings({en});
    }
  };
}

function withTheme(component: React.ReactNode): React.ReactElement {
  return <StyledApp themeId={THEME_ID.DEFAULT}>{legacyRootProviderWrapper({children: component})}</StyledApp>;
}

function withReactTranslationTheme(component: React.ReactNode): React.ReactElement {
  return (
    <StyledApp themeId={THEME_ID.DEFAULT}>
      {reactTranslationRenderingRootProviderWrapper({children: component})}
    </StyledApp>
  );
}

const createFailedToAddUsersMessages = (
  failures: AddUsersFailure[] = [{users: [], backends: [], reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS}],
): FailedToAddUsersMessageEntity => {
  return new FailedToAddUsersMessageEntity(failures, Date.now(), translateForTest);
};

function createUser(qualifiedId: QualifiedId, name: string): User {
  const user = new User(qualifiedId.id, qualifiedId.domain, translateForTest);
  user.name(name);
  return user;
}

describe('FailedToAddUsersMessage', () => {
  it('shows that 1 user could not be added', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');

    const user1 = createUser(qualifiedId1, 'Felix');
    userState.users.push(user1);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: [],
      },
    ]);

    const {getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Felix could not be added to the group as the backend of test.domain could not be reached.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);
  });

  it('shows that multiple users could not be added', async () => {
    const userState = new UserState();
    const [qualifiedId1, qualifiedId2, qualifiedId3] = generateQualifiedIds(3, 'test.domain');

    const user1 = createUser(qualifiedId1, 'Virgile');
    const user2 = createUser(qualifiedId2, 'Bardia');
    const user3 = createUser(qualifiedId3, 'Patryk');
    userState.users([user1, user2, user3]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2, qualifiedId3],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: [],
      },
    ]);

    const {getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '3 participants could not be added to the group.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of failed to add multi users', async () => {
    const userState = new UserState();
    const [qualifiedId1, qualifiedId2, qualifiedId3] = generateQualifiedIds(3, 'test.domain');

    const user1 = createUser(qualifiedId1, 'Tim');
    const user2 = createUser(qualifiedId2, 'Adrian');
    const user3 = createUser(qualifiedId3, 'Przemek');
    userState.users([user1, user2, user3]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2, qualifiedId3],
        backends: ['test.domain'],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
      },
    ]);

    const {getByText, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '3 participants could not be added to the group.',
    );

    expect(mainMessage.length).toBeGreaterThanOrEqual(1);

    const toggleButton = getByText('Show details');

    act(() => {
      toggleButton.click();
    });

    const details = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Adrian, Przemek and Tim could not be added to the group as the backend of test.domain could not be reached.',
    );

    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of failed to add multi users from 2 different backends', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');

    const user1 = createUser(qualifiedId1, 'Tom');
    const user2 = createUser(qualifiedId2, 'Arjita');
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: ['test.domain', 'test-2.domain'],
      },
    ]);

    const {getByText, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '2 participants could not be added to the group.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);

    const toggleButton = getByText('Show details');

    act(() => {
      toggleButton.click();
    });

    const details = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Arjita and Tom could not be added to the group as the backend of test.domain, test-2.domain could not be reached.',
    );

    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of failed to add users from non federating backends', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');

    const user1 = createUser(qualifiedId1, 'Patryk');
    const user2 = createUser(qualifiedId2, 'Przemek');
    userState.users([user1, user2]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1, qualifiedId2],
        reason: AddUsersFailureReasons.NON_FEDERATING_BACKENDS,
        backends: [],
      },
    ]);

    const {getByTestId, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');

    const toggleButton = getByTestId('toggle-failed-to-add-users');

    act(() => {
      toggleButton.click();
    });

    const details = getAllByText(
      (_, element) =>
        element?.textContent ===
        'Przemek and Patryk could not be added to the group as their backends do not federate with each other.',
    );

    expect(details.length).toBeGreaterThanOrEqual(1);
  });

  it('shows details of multiple failed reasons', async () => {
    const userState = new UserState();
    const [qualifiedId1] = generateQualifiedIds(1, 'test.domain');
    const [qualifiedId2] = generateQualifiedIds(1, 'test-2.domain');
    const [qualifiedId3] = generateQualifiedIds(1, 'test-3.domain');

    const user1 = createUser(qualifiedId1, 'Patryk');
    const user2 = createUser(qualifiedId2, 'Przemek');
    const user3 = createUser(qualifiedId3, 'Tom');
    userState.users([user1, user2, user3]);

    const message = createFailedToAddUsersMessages([
      {
        users: [qualifiedId1],
        reason: AddUsersFailureReasons.NON_FEDERATING_BACKENDS,
        backends: [],
      },
      {
        users: [qualifiedId2],
        reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
        backends: [qualifiedId2.domain],
      },
      {
        users: [qualifiedId3],
        reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG,
      },
    ]);

    const {getByTestId, getAllByText} = render(
      withTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
    );

    const elementMessageFailedToAdd = getByTestId('element-message-failed-to-add-users');
    expect(elementMessageFailedToAdd.getAttribute('data-uie-value')).toEqual('multi-users-not-added');

    const toggleButton = getByTestId('toggle-failed-to-add-users');

    act(() => {
      toggleButton.click();
    });

    const mainMessage = getAllByText(
      (_, element) => element?.textContent === '3 participants could not be added to the group.',
    );
    expect(mainMessage.length).toBeGreaterThanOrEqual(1);

    const details1 = getAllByText(
      (_, element) =>
        element?.textContent ===
        `${user1.name()} could not be added to the group as their backends do not federate with each other.`,
    );

    expect(details1.length).toBeGreaterThanOrEqual(1);

    const details2 = getAllByText(
      (_, element) =>
        element?.textContent ===
        `${user2.name()} could not be added to the group as the backend of ${user2.qualifiedId.domain} could not be reached.`,
    );

    expect(details2.length).toBeGreaterThanOrEqual(1);

    const details3 = getAllByText(
      (_, element) => element?.textContent === `${user3.name()} could not be added to the group.`,
    );

    expect(details3.length).toBeGreaterThanOrEqual(1);
  });

  it(
    'renders a single-user unreachable-backend summary with opaque runtime text when enabled',
    withTranslationStrings(en, () => {
      const userState = new UserState();
      const [qualifiedId] = generateQualifiedIds(1, 'backend.<example>');
      const user = createUser(qualifiedId, 'R&D <Test>');
      userState.users.push(user);

      const message = createFailedToAddUsersMessages([
        {
          users: [qualifiedId],
          reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
          backends: [],
        },
      ]);

      const {getByTestId} = render(
        withReactTranslationTheme(<FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />),
      );
      const messageDetails = getByTestId('1-user-not-added-details');
      const strongElements = messageDetails.querySelectorAll('strong');
      const learnMoreLink = getByTestId('go-offline-backend');

      expect(messageDetails).toHaveTextContent(
        'R&D <Test> could not be added to the group as the backend of backend.<example> could not be reached.',
      );
      expect(strongElements).toHaveLength(2);
      expect(strongElements[0]).toHaveTextContent('R&D <Test>');
      expect(strongElements[1]).toHaveTextContent('backend.<example>');
      expect(messageDetails.querySelector('test')).toBeNull();
      expect(messageDetails.querySelector('example')).toBeNull();
      expect(learnMoreLink).toHaveTextContent('Learn more');
      expect(learnMoreLink).toHaveAttribute('data-uie-name', 'go-offline-backend');
      expect(learnMoreLink).toHaveAttribute('target', '_blank');
    }),
  );

  it(
    'keeps translation-looking and internal-marker-looking names literal when enabled',
    withTranslationStrings(en, () => {
      const runtimeNames = [
        '[bold]Admin[/bold]',
        '__wire_react_translation_name_start__value__wire_react_translation_name_end__',
      ];

      for (const runtimeName of runtimeNames) {
        const userState = new UserState();
        const [qualifiedId] = generateQualifiedIds(1, 'test.domain');
        const user = createUser(qualifiedId, runtimeName);
        userState.users.push(user);

        const message = createFailedToAddUsersMessages([
          {
            users: [qualifiedId],
            reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
            backends: [],
          },
        ]);

        const {getByTestId, unmount} = render(
          withReactTranslationTheme(
            <FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />,
          ),
        );
        const messageDetails = getByTestId('1-user-not-added-details');
        const nameStrongElement = messageDetails.querySelector('strong');

        expect(messageDetails).toHaveTextContent(runtimeName);
        expect(nameStrongElement).toHaveTextContent(runtimeName);
        expect(nameStrongElement?.querySelector('strong')).toBeNull();

        unmount();
      }
    }),
  );

  it(
    'keeps unsupported summary markup as text and preserves translated name and domain placement',
    withTranslationStrings(
      {
        ...en,
        failedToAddParticipantSingularOfflineBackend:
          '<img src="example">The backend {domain} rejected [bold]{name}[/bold].',
      },
      () => {
        const userState = new UserState();
        const [qualifiedId] = generateQualifiedIds(1, '[bold]backend[/bold]');
        const user = createUser(qualifiedId, 'R&D <Test>');
        userState.users.push(user);

        const message = createFailedToAddUsersMessages([
          {
            users: [qualifiedId],
            reason: AddUsersFailureReasons.UNREACHABLE_BACKENDS,
            backends: [],
          },
        ]);

        const {getByTestId} = render(
          withReactTranslationTheme(
            <FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />,
          ),
        );
        const messageDetails = getByTestId('1-user-not-added-details');

        expect(messageDetails).toHaveTextContent(
          '<img src="example">The backend [bold]backend[/bold] rejected R&D <Test>.',
        );
        expect(messageDetails.querySelector('img')).toBeNull();
        expect(messageDetails.querySelectorAll('strong')).toHaveLength(1);
        expect(messageDetails.querySelector('strong')).toHaveTextContent('R&D <Test>');
      },
    ),
  );

  it(
    'renders a translator-positioned plural summary through React',
    withTranslationStrings(
      {
        ...en,
        failedToAddParticipantsPlural:
          '<meta name="example" content="value">Rejected: [bold]participants total={total}[/bold].',
      },
      () => {
        const userState = new UserState();
        const qualifiedIds = generateQualifiedIds(2, 'test.domain');
        userState.users(qualifiedIds.map(qualifiedId => createUser(qualifiedId, qualifiedId.id)));

        const message = createFailedToAddUsersMessages([
          {
            users: qualifiedIds,
            reason: AddUsersFailureReasons.OFFLINE_FOR_TOO_LONG,
          },
        ]);

        const {getByTestId} = render(
          withReactTranslationTheme(
            <FailedToAddUsersMessage isMessageFocused message={message} userState={userState} />,
          ),
        );
        const messageSummary = getByTestId('element-message-failed-to-add-users');

        expect(messageSummary).toHaveAttribute('data-uie-value', 'multi-users-not-added');
        expect(messageSummary).toHaveTextContent(
          '<meta name="example" content="value">Rejected: participants total=2.',
        );
        expect(messageSummary.querySelector('meta')).toBeNull();
        expect(messageSummary.querySelectorAll('strong')).toHaveLength(1);
        expect(messageSummary.querySelector('strong')).toHaveTextContent('participants total=2');
      },
    ),
  );
});
