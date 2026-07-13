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

import {useEffect, useMemo, useRef} from 'react';

import {contentStyles} from 'Components/Meeting/Meeting.styles';
import {MeetingCallingView} from 'Components/Meeting/MeetingCallingView/MeetingCallingView';
import {meetingsContentWrapperStyles} from 'Components/Meeting/MeetingCallingView/meetingCallingView.styles';
import {MeetingHeader} from 'Components/Meeting/MeetingHeader/MeetingHeader';
import {MeetingList} from 'Components/Meeting/MeetingList/MeetingList';
import {createMeetingStore} from 'Components/Meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider, useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {ScheduleMeetingModal} from 'Components/Meeting/ScheduleMeetingModal';
import {useApplicationContext} from 'src/script/page/rootProvider';

const MeetingsContent = () => {
  const {fireAndForgetInvoker} = useApplicationContext();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const meetingSeries = useMeetingStore(state => state.meetingSeries);
  const isLoading = useMeetingStore(state => state.isLoading);
  const hasLoadError = useMeetingStore(state => state.hasLoadError);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);

  useEffect(() => {
    fireAndForgetInvoker.fireAndForget(loadMeetings);
  }, [loadMeetings, fireAndForgetInvoker]);

  return (
    <div css={meetingsContentWrapperStyles}>
      <MeetingHeader />
      <div css={contentStyles} ref={scrollContainerRef}>
        <MeetingList
          meetingSeries={meetingSeries}
          isLoading={isLoading}
          hasLoadError={hasLoadError}
          scrollElementRef={scrollContainerRef}
        />
      </div>
      <MeetingCallingView />
      <ScheduleMeetingModal />
    </div>
  );
};

export const Meetings = () => {
  const {mainViewModel, wallClock} = useApplicationContext();
  const {meetings: meetingsRepository, conversation: conversationRepository} = mainViewModel.content.repositories;

  const store = useMemo(
    () =>
      createMeetingStore({
        meetingsRepository,
        conversationRepository,
        wallClock,
      }),
    [meetingsRepository, conversationRepository, wallClock],
  );

  return (
    <MeetingStoreProvider store={store}>
      <MeetingsContent />
    </MeetingStoreProvider>
  );
};
