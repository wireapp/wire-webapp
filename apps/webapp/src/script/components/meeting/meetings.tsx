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

import {container} from 'tsyringe';

import {contentStyles} from 'Components/meeting/meeting.styles';
import {MeetingCallingView} from 'Components/meeting/meetingCallingView/meetingCallingView';
import {meetingsContentWrapperStyles} from 'Components/meeting/meetingCallingView/meetingCallingView.styles';
import {MeetingHeader} from 'Components/meeting/meetingHeader/meetingHeader';
import {MeetingList} from 'Components/meeting/meetingList/meetingList';
import {useMeetingStore} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {MeetNowModal} from 'Components/meeting/meetNowModal/meetNowModal';
import {ScheduleMeetingModal} from 'Components/meeting/scheduleMeetingModal';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';

export const Meetings = () => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const meetingSeries = useMeetingStore(state => state.meetingSeries);
  const isLoading = useMeetingStore(state => state.isLoading);
  const hasLoadError = useMeetingStore(state => state.hasLoadError);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);
  const selfUser = container.resolve(UserState).self();

  const refreshMeetings = useCallback(
    () => fireAndForgetInvoker.fireAndForget(loadMeetings),
    [fireAndForgetInvoker, loadMeetings],
  );

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
    </div>
  );
};
