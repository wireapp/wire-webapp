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

import {useCallback, useEffect, useMemo, useRef, type FunctionComponent} from 'react';

import {container} from 'tsyringe';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {contentStyles} from './meeting.styles';
import {MeetingCallingView} from './meetingCallingView/meetingCallingView';
import {meetingsContentWrapperStyles} from './meetingCallingView/meetingCallingView.styles';
import {MeetingHeader} from './meetingHeader/meetingHeader';
import {MeetingList} from './meetingList/meetingList';
import {createMeetingPrepPreview} from './meetingPrep/createMeetingPrepPreview';
import {MeetingPrepModal} from './meetingPrep/meetingPrepModal';
import {useMeetingPrepJoin} from './meetingPrep/useMeetingPrepJoin';
import {useMeetingStore} from './meetingStore/meetingStoreProvider';
import {MeetNowModal} from './meetNowModal/meetNowModal';
import {ScheduleMeetingModal} from './scheduleMeetingModal';

import {MediaStreamHandler} from '../../repositories/media/MediaStreamHandler';
import {UserState} from '../../repositories/user/userState';

export const Meetings: FunctionComponent = () => {
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
  const selfUser = container.resolve(UserState).self();
  const preview = useMemo(() => {
    return createMeetingPrepPreview(container.resolve(MediaStreamHandler));
  }, []);
  const joinMeeting = useMeetingPrepJoin();

  const refreshMeetings = useCallback(() => {
    return fireAndForgetInvoker.fireAndForget(loadMeetings);
  }, [fireAndForgetInvoker, loadMeetings]);

  useEffect(() => {
    refreshMeetings();
  }, [refreshMeetings]);

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
      <MeetingPrepModal
        participant={selfUser}
        requestPreviewStream={preview.requestPreviewStream}
        releasePreviewStream={preview.releasePreviewStream}
        joinMeeting={joinMeeting}
      />
    </div>
  );
};
