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

import {useCallback, useEffect, useRef} from 'react';

import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {contentStyles} from 'Components/Meeting/meeting.styles';
import {MeetingCallingView} from 'Components/Meeting/MeetingCallingView/meetingCallingView';
import {meetingsContentWrapperStyles} from 'Components/Meeting/MeetingCallingView/meetingCallingView.styles';
import {MeetingHeader} from 'Components/Meeting/MeetingHeader/MeetingHeader';
import {MeetingList} from 'Components/Meeting/MeetingList/MeetingList';
import {createMeetingNotificationEventHandlers} from 'Components/Meeting/meetingNotificationEventHandlers';
import {useMeetingNotificationStore} from 'Components/Meeting/meetingNotificationStore/meetingNotificationStore';
import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {MeetNowModal} from 'Components/Meeting/meetNowModal/meetNowModal';
import {ScheduleMeetingModal} from 'Components/Meeting/ScheduleMeetingModal';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {getLogger} from 'Util/logger';

const logger = getLogger('Meetings');

export const Meetings = () => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const meetingSeries = useMeetingStore(state => state.meetingSeries);
  const isLoading = useMeetingStore(state => state.isLoading);
  const hasLoadError = useMeetingStore(state => state.hasLoadError);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);
  const removeMeetingByQualifiedId = useMeetingStore(state => state.removeMeetingByQualifiedId);
  const addNotification = useMeetingNotificationStore(state => state.addNotification);
  const selfUser = container.resolve(UserState).self();

  const refreshMeetings = useCallback(
    () => fireAndForgetInvoker.fireAndForget(loadMeetings),
    [fireAndForgetInvoker, loadMeetings],
  );

  useEffect(() => {
    refreshMeetings();
  }, [refreshMeetings]);

  const meetingSeriesRef = useRef(meetingSeries);
  meetingSeriesRef.current = meetingSeries;

  const notificationHandlersRef = useRef<ReturnType<typeof createMeetingNotificationEventHandlers> | null>(null);

  useEffect(() => {
    const handlers = createMeetingNotificationEventHandlers({
      getMeetingSeries: () => meetingSeriesRef.current,
      addNotification,
      removeMeetingByQualifiedId,
      logger,
    });
    notificationHandlersRef.current = handlers;

    amplify.subscribe(WebAppEvents.MEETING.CREATED, handlers.onMeetingCreated);
    amplify.subscribe(WebAppEvents.MEETING.UPDATED, handlers.onMeetingUpdated);
    amplify.subscribe(WebAppEvents.MEETING.DELETED, handlers.onMeetingDeleted);

    return () => {
      notificationHandlersRef.current = null;
      amplify.unsubscribe(WebAppEvents.MEETING.CREATED, handlers.onMeetingCreated);
      amplify.unsubscribe(WebAppEvents.MEETING.UPDATED, handlers.onMeetingUpdated);
      amplify.unsubscribe(WebAppEvents.MEETING.DELETED, handlers.onMeetingDeleted);
    };
  }, [addNotification, removeMeetingByQualifiedId]);

  useEffect(() => {
    notificationHandlersRef.current?.retryPendingNotifications();
  }, [meetingSeries]);

  return (
    <div css={meetingsContentWrapperStyles}>
      <MeetingHeader />
      <div css={contentStyles} ref={scrollContainerRef}>
        <MeetingList
          meetingSeries={meetingSeries}
          isLoading={isLoading}
          hasLoadError={hasLoadError}
          onRefresh={refreshMeetings}
          scrollElementRef={scrollContainerRef}
          selfUser={selfUser}
        />
      </div>
      <MeetingCallingView />
      <ScheduleMeetingModal />
      <MeetNowModal />
    </div>
  );
};
