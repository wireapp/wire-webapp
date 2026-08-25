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

import {type ReactNode, useEffect, useMemo} from 'react';

import {container} from 'tsyringe';

import {createMeetingNotificationEventHandlers} from 'Components/meeting/meetingNotificationEventHandlers';
import {useMeetingNotificationStore} from 'Components/meeting/meetingNotificationStore/meetingNotificationStore';
import {createMeetingStore} from 'Components/meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {deleteMeetingForAll, deleteMeetingForMe} from 'Components/meeting/shared/service/deleteMeeting';
import {meetNowMeeting, scheduleMeeting, updateMeeting} from 'Components/meeting/shared/service/meetingService';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {getLogger} from 'Util/logger';
import {useMeetingsFeatureFlag} from 'Util/useMeetingsFeatureFlag';

import {createMeetingLifecycleDispatcher} from './createMeetingLifecycleDispatcher';
import {subscribeToMeetingConversationEvents} from './subscribeToMeetingConversationEvents';
import {subscribeToMeetingLifecycleEvents} from './subscribeToMeetingLifecycleEvents';

const logger = getLogger('MeetingStoreRoot');

type MeetingStoreRootProps = {
  children: ReactNode;
};

/**
 * Owns the single meeting store of a signed-in session and keeps it in sync with the
 * meeting lifecycle events, independently of whether the meetings view is currently rendered.
 */
export const MeetingStoreRoot = ({children}: MeetingStoreRootProps) => {
  const {mainViewModel, wallClock} = useApplicationContext();
  const {isMeetingsEnabled} = useMeetingsFeatureFlag();
  const {
    meetings: meetingsRepository,
    conversation: conversationRepository,
    calling: callingRepository,
  } = mainViewModel.content.repositories;

  const store = useMemo(() => {
    const meetingServiceDeps = {meetingsRepository, conversationRepository, callingRepository, wallClock};

    return createMeetingStore({
      ...meetingServiceDeps,
      serviceTasks: {
        scheduleMeeting: command => scheduleMeeting(command, meetingServiceDeps),
        meetNowMeeting: command => meetNowMeeting(command, meetingServiceDeps),
        updateMeeting: command => updateMeeting(command, meetingServiceDeps),
        deleteMeetingForMe: command => deleteMeetingForMe(command, meetingServiceDeps),
        deleteMeetingForAll: command => deleteMeetingForAll(command, meetingServiceDeps),
      },
    });
  }, [meetingsRepository, conversationRepository, callingRepository, wallClock]);

  useEffect(() => {
    if (!isMeetingsEnabled) {
      return undefined;
    }

    const dispatcher = createMeetingLifecycleDispatcher({
      loadMeetings: () => store.getState().loadMeetings(),
      syncMeeting: meetingId => store.getState().syncMeetingByQualifiedId(meetingId),
      removeMeeting: meetingId => store.getState().removeMeetingByQualifiedId(meetingId),
      reportOperationFailure: operationName => {
        logger.warn('meeting lifecycle operation failed', {operationName});
      },
    });

    const notificationStore = useMeetingNotificationStore.getState();
    const notificationHandlers = createMeetingNotificationEventHandlers({
      getMeetingSeries: () => store.getState().meetingSeries,
      wallClock,
      addNotification: notificationStore.addNotification,
      dismissNotificationsForMeeting: notificationStore.dismissNotificationsForMeeting,
      logger,
    });

    const getSelfUserQualifiedId = () => container.resolve(UserState).self().qualifiedId;

    const unsubscribeFromMeetingLifecycleEvents = subscribeToMeetingLifecycleEvents({
      dispatcher,
      getSelfUserQualifiedId,
      notifyMeetingChange: notificationHandlers.notifyMeetingChange,
      notifyUpdate: notificationHandlers.notifyUpdate,
      onMeetingCancelled: notificationHandlers.onMeetingCancelled,
    });
    const unsubscribeFromMeetingConversationEvents = subscribeToMeetingConversationEvents({
      dispatcher,
      getMeetingSeries: () => store.getState().meetingSeries,
      onMeetingCancelled: notificationHandlers.onMeetingCancelled,
    });
    const unsubscribeFromMeetingStore = store.subscribe((state, previousState) => {
      if (state.meetingSeries !== previousState.meetingSeries) {
        notificationHandlers.retryPendingNotifications();
      }
    });

    dispatcher.enqueueInitialLoad();

    return () => {
      unsubscribeFromMeetingLifecycleEvents();
      unsubscribeFromMeetingConversationEvents();
      unsubscribeFromMeetingStore();
    };
  }, [isMeetingsEnabled, store]);

  return <MeetingStoreProvider store={store}>{children}</MeetingStoreProvider>;
};
