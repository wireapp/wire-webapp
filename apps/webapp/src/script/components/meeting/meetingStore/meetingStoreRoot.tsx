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

import {createMeetingReminderOsNotifier} from 'Components/meeting/createMeetingReminderOsNotifier';
import {createMeetingReminderScheduler} from 'Components/meeting/createMeetingReminderScheduler';
import {createBrowserDeviceTimeZone} from 'Components/meeting/deviceTimeZone';
import {createMeetingNotificationEventHandlers} from 'Components/meeting/meetingNotificationEventHandlers';
import {
  MeetingNotificationKind,
  useMeetingNotificationStore,
} from 'Components/meeting/meetingNotificationStore/meetingNotificationStore';
import {useMeetingPrepModal} from 'Components/meeting/meetingPrep/useMeetingPrepModal';
import {createMeetingStore} from 'Components/meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {deleteMeetingForAll, deleteMeetingForMe} from 'Components/meeting/shared/service/deleteMeeting';
import {meetNowMeeting, scheduleMeeting, updateMeeting} from 'Components/meeting/shared/service/meetingService';
import {UserState} from 'Repositories/user/userState';
import {createBrowserSystemNotificationApi} from 'src/script/browser/notification/createSystemNotificationApiFromBrowserNotification';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {getLogger} from 'Util/logger';
import {formatTimeShort} from 'Util/timeUtil';
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
  const {mainViewModel, clock, translate} = useApplicationContext();
  const {isMeetingsEnabled} = useMeetingsFeatureFlag();
  const {
    meetings: meetingsRepository,
    conversation: conversationRepository,
    calling: callingRepository,
  } = mainViewModel.content.repositories;
  const deviceTimeZone = useMemo(() => {
    return createBrowserDeviceTimeZone();
  }, []);

  const store = useMemo(() => {
    const meetingServiceDeps = {
      meetingsRepository,
      conversationRepository,
      callingRepository,
      clock,
      deviceTimeZone,
    };

    return createMeetingStore({
      ...meetingServiceDeps,
      serviceTasks: {
        scheduleMeeting: command => {
          return scheduleMeeting(command, meetingServiceDeps);
        },
        meetNowMeeting: command => {
          return meetNowMeeting(command, meetingServiceDeps);
        },
        updateMeeting: command => {
          return updateMeeting(command, meetingServiceDeps);
        },
        deleteMeetingForMe: command => {
          return deleteMeetingForMe(command, meetingServiceDeps);
        },
        deleteMeetingForAll: command => {
          return deleteMeetingForAll(command, meetingServiceDeps);
        },
      },
    });
  }, [meetingsRepository, conversationRepository, callingRepository, clock, deviceTimeZone]);

  useEffect(() => {
    if (!isMeetingsEnabled) {
      return undefined;
    }

    const dispatcher = createMeetingLifecycleDispatcher({
      loadMeetings: () => {
        return store.getState().loadMeetings();
      },
      syncMeeting: meetingId => {
        return store.getState().syncMeetingByQualifiedId(meetingId);
      },
      removeMeeting: meetingId => {
        return store.getState().removeMeetingByQualifiedId(meetingId);
      },
      reportOperationFailure: operationName => {
        logger.warn('meeting lifecycle operation failed', {operationName});
      },
    });

    const notificationStore = useMeetingNotificationStore.getState();
    const notificationHandlers = createMeetingNotificationEventHandlers({
      getMeetingSeries: () => {
        return store.getState().meetingSeries;
      },
      clock,
      addNotification: notificationStore.addNotification,
      dismissNotificationsForMeeting: notificationStore.dismissNotificationsForMeeting,
      logger,
    });
    const reminderOsNotifier = createMeetingReminderOsNotifier({
      notificationApi: createBrowserSystemNotificationApi(),
      openMeetingsList: () => {
        return mainViewModel.list.openMeetingsList();
      },
      openMeetingPrep: payload => {
        useMeetingPrepModal.getState().open({
          meetingTitle: payload.meetingTitle,
          meetingStartTime: payload.meetingStartTime,
          qualifiedMeetingId: payload.qualifiedId,
          qualifiedConversationId: payload.qualifiedConversationId,
        });
      },
      formatMeetingTime: formatTimeShort,
      translate,
      logger,
    });
    // One scheduler, two sinks: the in-app card always fires, the OS toast is additive.
    const reminderScheduler = createMeetingReminderScheduler({
      clock,
      onReminder: payload => {
        notificationStore.addNotification({
          ...payload,
          kind: MeetingNotificationKind.REMINDER,
        });
        reminderOsNotifier.notify(payload);
      },
    });

    const getSelfUserQualifiedId = () => {
      return container.resolve(UserState).self().qualifiedId;
    };

    const unsubscribeFromMeetingLifecycleEvents = subscribeToMeetingLifecycleEvents({
      dispatcher,
      getSelfUserQualifiedId,
      notifyMeetingChange: notificationHandlers.notifyMeetingChange,
      notifyUpdate: notificationHandlers.notifyUpdate,
      onMeetingCancelled: notificationHandlers.onMeetingCancelled,
    });
    const unsubscribeFromMeetingConversationEvents = subscribeToMeetingConversationEvents({
      dispatcher,
      getMeetingSeries: () => {
        return store.getState().meetingSeries;
      },
      onMeetingCancelled: notificationHandlers.onMeetingCancelled,
    });
    const unsubscribeFromMeetingStore = store.subscribe((state, previousState) => {
      if (state.meetingSeries !== previousState.meetingSeries) {
        notificationHandlers.retryPendingNotifications();
        reminderScheduler.sync(state.meetingSeries);
      }
    });

    reminderScheduler.sync(store.getState().meetingSeries);
    dispatcher.enqueueInitialLoad();

    return () => {
      unsubscribeFromMeetingLifecycleEvents();
      unsubscribeFromMeetingConversationEvents();
      unsubscribeFromMeetingStore();
      reminderScheduler.stop();
      reminderOsNotifier.stop();
    };
  }, [isMeetingsEnabled, store, clock, mainViewModel, translate]);

  return <MeetingStoreProvider store={store}>{children}</MeetingStoreProvider>;
};
