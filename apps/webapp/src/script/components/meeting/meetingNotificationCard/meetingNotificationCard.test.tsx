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
import {fireEvent, render, screen} from '@testing-library/react';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {container} from 'tsyringe';

import en from 'I18n/en-US.json';
import {User} from 'Repositories/entity/User';
import {UserState} from 'Repositories/user/userState';
import {useMeetingPrepModal} from 'Components/meeting/meetingPrep/useMeetingPrepModal';
import {useJoinMeetingCall} from 'Components/meeting/useJoinMeetingCall';
import {MeetingNotificationCard} from './meetingNotificationCard';
import {
  type MeetingNotification,
  MeetingNotificationKind,
} from 'Components/meeting/meetingNotificationStore/meetingNotificationStore';
import {formatLocale} from 'Util/timeUtil';
import {setStrings, translate, type Translate} from 'Util/localizerUtil';
import type {Substitutions, TranslationKey} from 'Util/localizerUtil/translationTypes';
import type {ReactElement} from 'react';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';

jest.mock('Components/meeting/useJoinMeetingCall', () => ({
  useJoinMeetingCall: jest.fn(),
}));

const qualifiedId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const qualifiedConversationId: QualifiedId = {id: 'conversation-id', domain: 'example.com'};
const qualifiedCreator: QualifiedId = {id: 'creator-id', domain: 'example.com'};
const meetingStartTime = '2026-06-01T09:00:00.000Z';
const ongoingMeetingStartTime = '2026-06-01T09:50:00.000Z';
const specialCharacterName = `Eldon Bauch ±§!@#{}[]:"|;'\\<>?,./$%^&*()`;
const renderedTranslations: Partial<Record<TranslationKey, (substitutions?: Substitutions) => string>> = {
  'meetings.notifications.title': substitutions => `${substitutions?.label} ${substitutions?.meetingTitle}`,
  'meetings.notifications.by': substitutions => `By ${substitutions?.organizer}`,
  'meetings.meetingStatus.startedAt': substitutions => `Started at ${substitutions?.time}`,
  'meetings.notifications.startsAt': substitutions => `Starts at ${substitutions?.time}`,
};

const translateForNotificationTest: Translate = (key, substitutions) =>
  renderedTranslations[key]?.(substitutions) ?? key;
const mainViewModel = {
  content: {repositories: {conversation: {}, calling: {}}},
  calling: {callActions: {answer: jest.fn(), startAudio: jest.fn()}},
} as unknown as MainViewModel;
const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForNotificationTest, mainViewModel}),
);

const renderCard = (card: ReactElement) =>
  render(<ThemeProvider>{card}</ThemeProvider>, {wrapper: rootProviderWrapper});

describe('MeetingNotificationCard', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '#/');
    jest.mocked(useJoinMeetingCall).mockReturnValue({
      joinMeeting: jest.fn(),
      isJoinDisabled: false,
      isCallActive: false,
      isCallConnecting: false,
      isJoining: false,
    });
  });

  const notifications = [
    {
      id: 'notification-invite',
      kind: MeetingNotificationKind.INVITE,
      meetingTitle: 'meeting Title',
      qualifiedId,
      qualifiedConversationId,
      qualifiedCreator,
      meetingStartTime,
    },
    {
      id: 'notification-update',
      kind: MeetingNotificationKind.UPDATE,
      meetingTitle: 'meeting Title',
      qualifiedId,
      qualifiedConversationId,
      qualifiedCreator,
      meetingStartTime,
    },
    {
      id: 'notification-cancelled',
      kind: MeetingNotificationKind.CANCELLED,
      meetingTitle: 'meeting Title',
      qualifiedId,
      qualifiedConversationId,
      qualifiedCreator,
      meetingStartTime,
    },
    {
      id: 'notification-ongoing',
      kind: MeetingNotificationKind.ONGOING,
      meetingTitle: 'meeting Title',
      qualifiedId,
      qualifiedConversationId,
      qualifiedCreator,
      meetingStartTime: ongoingMeetingStartTime,
    },
    {
      id: 'notification-reminder',
      kind: MeetingNotificationKind.REMINDER,
      meetingTitle: 'meeting Title',
      qualifiedId,
      qualifiedConversationId,
      qualifiedCreator,
      meetingStartTime,
    },
  ] satisfies readonly MeetingNotification[];

  it.each(notifications)('renders the $kind variant', notification => {
    renderCard(<MeetingNotificationCard {...notification} onDismiss={jest.fn()} />);

    const card = screen.getByRole('listitem');
    expect(card).toHaveTextContent('meeting Title');
    expect(card).toHaveTextContent(
      {
        [MeetingNotificationKind.INVITE]: 'meetings.notifications.invitation',
        [MeetingNotificationKind.UPDATE]: 'meetings.notifications.update',
        [MeetingNotificationKind.CANCELLED]: 'meetings.notifications.canceled',
        [MeetingNotificationKind.ONGOING]: 'meetings.notifications.ongoing',
        [MeetingNotificationKind.REMINDER]: 'meetings.notifications.reminder',
      }[notification.kind],
    );
    expect(screen.getByRole('button', {name: 'meetings.notifications.dismiss'})).toBeInTheDocument();

    if (
      notification.kind === MeetingNotificationKind.INVITE ||
      notification.kind === MeetingNotificationKind.CANCELLED
    ) {
      expect(card).toHaveTextContent(`By creator-id • ${formatLocale(meetingStartTime, 'PP, p')}`);
    }

    if (notification.kind === MeetingNotificationKind.UPDATE) {
      expect(card).toHaveTextContent(`By creator-id • ${formatLocale(meetingStartTime, 'PP, p')}`);
      expect(card).not.toHaveTextContent('meetings.notifications.newTime');
    }

    if (notification.kind === MeetingNotificationKind.ONGOING) {
      expect(card).toHaveTextContent('By creator-id');
      expect(card).toHaveTextContent(`Started at ${formatLocale(ongoingMeetingStartTime, 'p')}`);
      expect(screen.getByText(`Started at ${formatLocale(ongoingMeetingStartTime, 'p')}`)).toHaveStyle({
        color: 'var(--accent-color)',
      });
    }

    if (notification.kind === MeetingNotificationKind.REMINDER) {
      expect(card).toHaveTextContent('By creator-id');
      expect(card).toHaveTextContent(`Starts at ${formatLocale(meetingStartTime, 'p')}`);
    }

    if (notification.kind === MeetingNotificationKind.CANCELLED) {
      expect(card).toHaveTextContent('By creator-id');
      expect(screen.queryByRole('button', {name: 'meetings.notifications.view'})).not.toBeInTheDocument();
    } else if (notification.kind === MeetingNotificationKind.ONGOING) {
      expect(screen.getByRole('button', {name: 'callJoin'})).toBeEnabled();
      expect(screen.queryByRole('button', {name: 'meetings.notifications.view'})).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', {name: 'meetings.notifications.view'})).toBeInTheDocument();
    }
  });

  it('highlights an ongoing time', () => {
    renderCard(
      <MeetingNotificationCard
        id="notification-ongoing"
        kind={MeetingNotificationKind.ONGOING}
        meetingTitle="Meeting Title"
        qualifiedId={qualifiedId}
        qualifiedConversationId={qualifiedConversationId}
        qualifiedCreator={qualifiedCreator}
        meetingStartTime={ongoingMeetingStartTime}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByText(`Started at ${formatLocale(ongoingMeetingStartTime, 'p')}`)).toHaveStyle({
      color: 'var(--accent-color)',
    });
  });

  it('opens the prep modal when Join is clicked', () => {
    const joinMeeting = jest.fn();
    const onDismiss = jest.fn();
    jest.mocked(useJoinMeetingCall).mockReturnValue({
      joinMeeting,
      isJoinDisabled: false,
      isCallActive: false,
      isCallConnecting: false,
      isJoining: false,
    });

    renderCard(
      <MeetingNotificationCard
        id="notification-ongoing"
        kind={MeetingNotificationKind.ONGOING}
        meetingTitle="Meeting Title"
        qualifiedId={qualifiedId}
        qualifiedConversationId={qualifiedConversationId}
        qualifiedCreator={qualifiedCreator}
        meetingStartTime={ongoingMeetingStartTime}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));

    expect(useJoinMeetingCall).toHaveBeenCalledWith(qualifiedConversationId);
    expect(joinMeeting).not.toHaveBeenCalled();
    expect(useMeetingPrepModal.getState().session.unwrapOr({meetingTitle: ''}).meetingTitle).toBe('Meeting Title');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('uses the panel-closing callback once the call is active', () => {
    const onCallJoined = jest.fn();
    jest.mocked(useJoinMeetingCall).mockReturnValue({
      joinMeeting: jest.fn(),
      isJoinDisabled: true,
      isCallActive: true,
      isCallConnecting: false,
      isJoining: false,
    });

    renderCard(
      <MeetingNotificationCard
        id="notification-ongoing"
        kind={MeetingNotificationKind.ONGOING}
        meetingTitle="Meeting Title"
        qualifiedId={qualifiedId}
        qualifiedConversationId={qualifiedConversationId}
        qualifiedCreator={qualifiedCreator}
        meetingStartTime={ongoingMeetingStartTime}
        onDismiss={jest.fn()}
        onCallJoined={onCallJoined}
      />,
    );

    expect(onCallJoined).toHaveBeenCalledTimes(1);
  });

  it('omits View for canceled cards and dismisses every variant', () => {
    const onDismiss = jest.fn();
    const {rerender} = renderCard(
      <MeetingNotificationCard
        id="notification-cancelled"
        kind={MeetingNotificationKind.CANCELLED}
        meetingTitle="Meeting Title"
        qualifiedId={qualifiedId}
        qualifiedConversationId={qualifiedConversationId}
        qualifiedCreator={qualifiedCreator}
        meetingStartTime={meetingStartTime}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.queryByRole('button', {name: 'meetings.notifications.view'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismiss'}));

    rerender(
      <ThemeProvider>
        <MeetingNotificationCard
          id="notification-invite"
          kind={MeetingNotificationKind.INVITE}
          meetingTitle="Meeting Title"
          qualifiedId={qualifiedId}
          qualifiedConversationId={qualifiedConversationId}
          qualifiedCreator={qualifiedCreator}
          meetingStartTime={meetingStartTime}
          onDismiss={onDismiss}
        />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismiss'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.view'}));

    expect(onDismiss).toHaveBeenCalledTimes(3);
    expect(window.location.hash).toBe('#/meetings');
  });

  it('renders the creator ID and formatted time from a store-shaped notification', () => {
    renderCard(
      <MeetingNotificationCard
        id="notification-invite"
        kind={MeetingNotificationKind.INVITE}
        meetingTitle="Meeting Title"
        qualifiedId={qualifiedId}
        qualifiedConversationId={qualifiedConversationId}
        qualifiedCreator={qualifiedCreator}
        meetingStartTime={meetingStartTime}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByRole('listitem')).toHaveTextContent(
      `By creator-id • ${formatLocale(meetingStartTime, 'PP, p')}`,
    );
  });

  it('renders an apostrophe in the meeting title instead of an HTML entity', () => {
    setStrings({en});
    const productionTranslateWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));

    render(
      <ThemeProvider>
        <MeetingNotificationCard
          id="notification-invite"
          kind={MeetingNotificationKind.INVITE}
          meetingTitle="Cleopatra's meeting"
          qualifiedId={qualifiedId}
          qualifiedConversationId={qualifiedConversationId}
          qualifiedCreator={qualifiedCreator}
          meetingStartTime={meetingStartTime}
          onDismiss={jest.fn()}
        />
      </ThemeProvider>,
      {wrapper: productionTranslateWrapper},
    );

    const card = screen.getByRole('listitem');
    expect(card).toHaveTextContent("Invitation: Cleopatra's meeting");
    expect(card).not.toHaveTextContent('&#x27;');
  });

  it('renders special characters in the organizer name without encoding them', () => {
    setStrings({en});
    const user = new User(qualifiedCreator.id, qualifiedCreator.domain, translate);
    user.name(specialCharacterName);
    const userState = container.resolve(UserState);
    const previousUsers = userState.users();
    userState.users([user]);

    try {
      render(
        <ThemeProvider>
          <MeetingNotificationCard
            id="notification-invite"
            kind={MeetingNotificationKind.INVITE}
            meetingTitle="Meeting Title"
            qualifiedId={qualifiedId}
            qualifiedConversationId={qualifiedConversationId}
            qualifiedCreator={qualifiedCreator}
            meetingStartTime={meetingStartTime}
            onDismiss={jest.fn()}
          />
        </ThemeProvider>,
        {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate}))},
      );

      const card = screen.getByRole('listitem');
      expect(card).toHaveTextContent(`By ${specialCharacterName} • ${formatLocale(meetingStartTime, 'PP, p')}`);
      expect(card).not.toHaveTextContent(/&quot;|&#x27;|&lt;|&gt;|&amp;/);
    } finally {
      userState.users(previousUsers);
    }
  });
});
