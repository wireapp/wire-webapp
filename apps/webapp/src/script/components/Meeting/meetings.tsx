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

import {useEffect, useRef} from 'react';

import {MEETING_EVENT, type MeetingEvent} from '@wireapp/api-client/lib/event';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {contentStyles} from 'Components/Meeting/meeting.styles';
import {MeetingCallingView} from 'Components/Meeting/MeetingCallingView/meetingCallingView';
import {meetingsContentWrapperStyles} from 'Components/Meeting/MeetingCallingView/meetingCallingView.styles';
import {MeetingHeader} from 'Components/Meeting/MeetingHeader/MeetingHeader';
import {MeetingList} from 'Components/Meeting/MeetingList/MeetingList';
import {
  MeetingNotificationKind,
  useMeetingNotificationStore,
} from 'Components/Meeting/meetingNotificationStore/meetingNotificationStore';
import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {MeetNowModal} from 'Components/Meeting/meetNowModal/meetNowModal';
import {ScheduleMeetingModal} from 'Components/Meeting/ScheduleMeetingModal';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {matchQualifiedIds} from 'Util/qualifiedId';

const getOrganizer = (meetingCreator: QualifiedId) =>
  container.resolve(UserState).users().find(user => matchQualifiedIds(user.qualifiedId, meetingCreator))?.name() ??
  meetingCreator.id;

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

  useEffect(() => {
    fireAndForgetInvoker.fireAndForget(loadMeetings);
  }, [loadMeetings, fireAndForgetInvoker]);

  const meetingSeriesRef = useRef(meetingSeries);
  meetingSeriesRef.current = meetingSeries;

  useEffect(() => {
    const getMeeting = (meetingId: QualifiedId) =>
      meetingSeriesRef.current.find(meeting => matchQualifiedIds(meeting.qualified_id, meetingId));

    const onMeetingEvent = (event: MeetingEvent) => {
      const meeting = getMeeting(event.qualified_id);
      if (!meeting) {
        return;
      }

      if (event.type === MEETING_EVENT.CREATE) {
        addNotification({
          kind: MeetingNotificationKind.INVITE,
          meetingTitle: meeting.title,
          meetingStartTime: meeting.series_start_date,
          qualifiedId: meeting.qualified_id,
          qualifiedCreator: meeting.qualified_creator,
        });
        return;
      }

      addNotification({
        kind: MeetingNotificationKind.UPDATE,
        meetingTitle: meeting.title,
        meetingStartTime: meeting.series_start_date,
        qualifiedId: meeting.qualified_id,
      });
    };

    const onMeetingDeleted = (meetingId: QualifiedId) => {
      const meeting = getMeeting(meetingId);
      if (!meeting) {
        return;
      }

      addNotification({
        kind: MeetingNotificationKind.CANCELLED,
        meetingTitle: meeting.title,
        meetingStartTime: meeting.series_start_date,
        qualifiedId: meeting.qualified_id,
        qualifiedCreator: meeting.qualified_creator,
      });
      removeMeetingByQualifiedId(meetingId);
    };

    amplify.subscribe(MEETING_EVENT.CREATE, onMeetingEvent);
    amplify.subscribe(MEETING_EVENT.UPDATE, onMeetingEvent);
    amplify.subscribe(WebAppEvents.MEETING.DELETED, onMeetingDeleted);

    return () => {
      amplify.unsubscribe(MEETING_EVENT.CREATE, onMeetingEvent);
      amplify.unsubscribe(MEETING_EVENT.UPDATE, onMeetingEvent);
      amplify.unsubscribe(WebAppEvents.MEETING.DELETED, onMeetingDeleted);
    };
  }, [addNotification, removeMeetingByQualifiedId]);

  const refreshMeetings = () => fireAndForgetInvoker.fireAndForget(loadMeetings);

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
