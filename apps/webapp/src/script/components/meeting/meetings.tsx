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

import {type FunctionComponent, useCallback, useEffect, useRef, useState} from 'react';

import {container} from 'tsyringe';

import {contentStyles} from './meeting.styles';
import {MeetingCallingView} from './meetingCallingView/meetingCallingView';
import {meetingsContentWrapperStyles} from './meetingCallingView/meetingCallingView.styles';
import {MeetingHeader} from './meetingHeader/meetingHeader';
import {MeetingList} from './meetingList/meetingList';
import {useMeetingStore} from './meetingStore/meetingStoreProvider';
import {MeetNowModal} from './meetNowModal/meetNowModal';
import {ScheduleMeetingModal} from './scheduleMeetingModal';

import type {QualifiedId} from '../../apiClient/user/qualifiedId';
import {useApplicationContext} from '../../page/rootProvider';
import {UserState} from '../../repositories/user/userState';
import {matchQualifiedIds} from '../../util/qualifiedId';

export const Meetings: FunctionComponent<{linkedMeetingId?: QualifiedId}> = ({linkedMeetingId}) => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const meetingSeries = useMeetingStore(state => {
    return state.meetingSeries;
  });
  const isLoading = useMeetingStore(state => {
    return state.isLoading;
  });
  const hasLoadError = useMeetingStore(state => {
    return state.hasLoadError;
  });
  const loadMeetings = useMeetingStore(state => {
    return state.loadMeetings;
  });
  const syncMeeting = useMeetingStore(state => {
    return state.syncMeetingByQualifiedId;
  });
  const [linkedMeetingIsLoading, setLinkedMeetingIsLoading] = useState(false);
  const [linkedMeetingHasLoadError, setLinkedMeetingHasLoadError] = useState(false);
  const selfUser = container.resolve(UserState).self();

  const refreshMeetings = useCallback(() => {
    if (linkedMeetingId !== undefined) {
      setLinkedMeetingIsLoading(true);
      setLinkedMeetingHasLoadError(false);
      void syncMeeting(linkedMeetingId).then(result => {
        setLinkedMeetingIsLoading(false);
        setLinkedMeetingHasLoadError(result.isErr);
      });
      return;
    }
    return fireAndForgetInvoker.fireAndForget(loadMeetings);
  }, [fireAndForgetInvoker, loadMeetings, linkedMeetingId, syncMeeting]);

  useEffect(() => {
    refreshMeetings();
  }, [refreshMeetings]);

  return (
    <div css={meetingsContentWrapperStyles}>
      <MeetingHeader showActions={linkedMeetingId === undefined} />
      <div css={contentStyles} ref={scrollContainerRef}>
        <MeetingList
          meetingSeries={
            linkedMeetingId === undefined
              ? meetingSeries
              : meetingSeries.filter(series => {
                  return matchQualifiedIds(series.qualified_id, linkedMeetingId);
                })
          }
          isLoading={linkedMeetingId === undefined ? isLoading : linkedMeetingIsLoading}
          hasLoadError={linkedMeetingId === undefined ? hasLoadError : linkedMeetingHasLoadError}
          onRefresh={refreshMeetings}
          scrollElementRef={scrollContainerRef}
          selfUser={selfUser}
          isLinkedMeeting={linkedMeetingId !== undefined}
        />
      </div>
      <MeetingCallingView />
      {linkedMeetingId === undefined && <ScheduleMeetingModal />}
      {linkedMeetingId === undefined && <MeetNowModal />}
    </div>
  );
};
