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

import {useMemo} from 'react';

import {render, screen, within} from '@testing-library/react';
import type {Virtualizer} from '@tanstack/react-virtual';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {createStore} from 'zustand/vanilla';

import type {MeetingStoreState} from 'Components/Meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import type {UseMeetingDayGroupVirtualizer} from 'Components/Meeting/MeetingList/useMeetingDayGroupVirtualizer';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {MeetingList, type MeetingListProps} from './MeetingList';

const createMeetingDayGroupVirtualizerForTest = (
  visibleDayGroupCount: number,
  getEstimatedDayGroupHeight: (dayGroupIndex: number) => number,
): Virtualizer<HTMLElement, Element> => {
  let startOffset = 0;
  const virtualItems = Array.from({length: visibleDayGroupCount}, (_unused, index) => {
    const size = getEstimatedDayGroupHeight(index);
    const start = startOffset;
    startOffset += size;

    return {index, key: index, size, start};
  });

  return {
    getVirtualItems: () => virtualItems,
    getTotalSize: () => startOffset,
    measure: () => undefined,
    measureElement: () => undefined,
    scrollToIndex: () => undefined,
    scrollElement: null,
  } as unknown as Virtualizer<HTMLElement, Element>;
};

const createUseMeetingDayGroupVirtualizerForTest = (): UseMeetingDayGroupVirtualizer => {
  return ({visibleDayGroupCount, getEstimatedDayGroupHeight}) =>
    useMemo(
      () => createMeetingDayGroupVirtualizerForTest(visibleDayGroupCount, getEstimatedDayGroupHeight),
      [visibleDayGroupCount, getEstimatedDayGroupHeight],
    );
};

const createMeetingSeries = (start: string, end: string, title: string): MeetingSeries => ({
  series_start_date: start,
  series_end_date: end,
  duration_ms: new Date(end).getTime() - new Date(start).getTime(),
  recurrence: 'doesNotRepeat',
  conversation_id: title,
  title,
  qualified_id: {id: `meeting-${title}`, domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  qualified_conversation: {id: 'conv-id', domain: 'example.com'},
});

const createMainViewModelForTest = (): MainViewModel =>
  ({
    content: {
      repositories: {
        conversation: {},
        calling: {},
      },
    },
    calling: {},
  }) as MainViewModel;

const createMeetingStoreForTest = () =>
  createStore<MeetingStoreState>(() => ({
    meetingSeries: [],
    isLoading: false,
    hasLoadError: false,
    loadMeetings: jest.fn(),
    scheduleMeeting: jest.fn(),
    meetNowMeeting: jest.fn(),
    updateMeeting: jest.fn(),
    deleteMeetingForMe: jest.fn(),
    deleteMeetingForAll: jest.fn(),
    removeMeetingByQualifiedId: jest.fn(),
    loadMeetingForEdit: jest.fn(),
  }));

const renderMeetingList = (
  props: Omit<MeetingListProps, 'useMeetingDayGroupVirtualizer' | 'selfUser'> &
    Partial<Pick<MeetingListProps, 'selfUser'>>,
  wallClock = createDeterministicWallClock(),
) => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      wallClock,
      mainViewModel: createMainViewModelForTest(),
    }),
  );
  const meetingStore = createMeetingStoreForTest();

  return render(
    withThemeAndRootContext(
      <MeetingStoreProvider store={meetingStore}>
        <MeetingList
          {...props}
          selfUser={props.selfUser}
          useMeetingDayGroupVirtualizer={createUseMeetingDayGroupVirtualizerForTest()}
        />
      </MeetingStoreProvider>,
      rootProviderWrapper,
    ),
  );
};

describe('MeetingList', () => {
  it('shows the load error when the first load fails before any meetings are available', () => {
    renderMeetingList({meetingSeries: [], isLoading: false, hasLoadError: true});

    expect(screen.getByText('meetings.list.loadError')).toBeInTheDocument();
  });

  it('renders ongoing meetings within the today section', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date('2026-06-15T14:30:00.000Z').getTime(),
    });

    const createRelativeSeries = (startHour: number, endHour: number, title: string): MeetingSeries => {
      const start = new Date(wallClock.currentDate);
      start.setHours(startHour, 0, 0, 0);

      const end = new Date(start);
      end.setHours(endHour, 0, 0, 0);

      return createMeetingSeries(start.toISOString(), end.toISOString(), title);
    };

    const meetingSeries = [
      createRelativeSeries(14, 15, 'Ongoing meeting'),
      createRelativeSeries(16, 17, 'Upcoming meeting'),
    ];

    renderMeetingList({meetingSeries, isLoading: false, hasLoadError: false}, wallClock);

    const todaySection = screen.getByText(/meetings\.list\.today/).closest('section');
    expect(todaySection).not.toBeNull();
    expect(within(todaySection!).getByText('Ongoing meeting')).toBeInTheDocument();
    expect(within(todaySection!).getByText('Upcoming meeting')).toBeInTheDocument();
    expect(document.querySelectorAll('section')).toHaveLength(1);
  });

  it('does not render meetings outside the initial visible day window', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date('2026-06-15T12:00:00.000Z').getTime(),
    });

    const meetingSeries = [
      createMeetingSeries('2026-06-15T14:00:00.000Z', '2026-06-15T15:00:00.000Z', 'Today meeting'),
      createMeetingSeries('2026-07-10T10:00:00.000Z', '2026-07-10T11:00:00.000Z', 'Far future meeting'),
    ];

    renderMeetingList({meetingSeries, isLoading: false, hasLoadError: false}, wallClock);

    expect(screen.getByText('Today meeting')).toBeInTheDocument();
    expect(screen.queryByText('Far future meeting')).not.toBeInTheDocument();
  });
});
