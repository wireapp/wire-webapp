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
import type {MeetingSeries} from './types/meetingSeries';

import type {QualifiedId} from '../../apiClient/user/qualifiedId';
import {useApplicationContext} from '../../page/rootProvider';
import {UserState} from '../../repositories/user/userState';

export const Meetings: FunctionComponent<{linkedMeetingId?: QualifiedId}> = ({linkedMeetingId}) => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const linkedRequestVersion = useRef(0);
  const [linkedMeetingLoad, setLinkedMeetingLoad] = useState<{
    key: string;
    status: 'loading' | 'ready' | 'error';
    meeting?: MeetingSeries;
  }>();
  const linkedMeetingIdValue = linkedMeetingId?.id;
  const linkedMeetingDomain = linkedMeetingId?.domain;
  const linkedMeetingKey =
    linkedMeetingIdValue === undefined || linkedMeetingDomain === undefined
      ? undefined
      : JSON.stringify([linkedMeetingIdValue, linkedMeetingDomain]);
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
  const syncMeetingByQualifiedId = useMeetingStore(state => {
    return state.syncMeetingByQualifiedId;
  });
  const selfUser = container.resolve(UserState).self();
  const currentLinkedLoad = linkedMeetingKey === linkedMeetingLoad?.key ? linkedMeetingLoad : undefined;
  const linkedMeetingSeries = currentLinkedLoad?.meeting === undefined ? [] : [currentLinkedLoad.meeting];
  const visibleMeetingSeries = linkedMeetingId === undefined ? meetingSeries : linkedMeetingSeries;

  const refreshMeetings = useCallback(() => {
    if (linkedMeetingKey === undefined || linkedMeetingIdValue === undefined || linkedMeetingDomain === undefined) {
      fireAndForgetInvoker.fireAndForget(loadMeetings);
      return;
    }

    const requestVersion = ++linkedRequestVersion.current;
    setLinkedMeetingLoad({key: linkedMeetingKey, status: 'loading'});
    void (async () => {
      try {
        const result = await syncMeetingByQualifiedId({id: linkedMeetingIdValue, domain: linkedMeetingDomain});
        if (linkedRequestVersion.current !== requestVersion) {
          return;
        }
        setLinkedMeetingLoad(
          result.isOk
            ? {key: linkedMeetingKey, status: 'ready', meeting: result.value.meeting}
            : {key: linkedMeetingKey, status: 'error'},
        );
      } catch {
        if (linkedRequestVersion.current === requestVersion) {
          setLinkedMeetingLoad({key: linkedMeetingKey, status: 'error'});
        }
      }
    })();
  }, [
    fireAndForgetInvoker,
    loadMeetings,
    linkedMeetingIdValue,
    linkedMeetingDomain,
    linkedMeetingKey,
    syncMeetingByQualifiedId,
  ]);

  useEffect(() => {
    refreshMeetings();
    return () => {
      linkedRequestVersion.current += 1;
    };
  }, [refreshMeetings]);

  return (
    <div css={meetingsContentWrapperStyles}>
      <MeetingHeader showActions={linkedMeetingId === undefined} isLinkedMeeting={linkedMeetingId !== undefined} />
      <div css={contentStyles} ref={scrollContainerRef}>
        <MeetingList
          meetingSeries={visibleMeetingSeries}
          isLoading={
            linkedMeetingId === undefined
              ? isLoading
              : currentLinkedLoad?.status !== 'ready' && currentLinkedLoad?.status !== 'error'
          }
          hasLoadError={linkedMeetingId === undefined && hasLoadError}
          linkedMeetingUnavailable={linkedMeetingId !== undefined && currentLinkedLoad?.status === 'error'}
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
