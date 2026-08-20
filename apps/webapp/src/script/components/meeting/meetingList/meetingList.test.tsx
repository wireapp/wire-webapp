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

import {act, fireEvent, render, screen} from '@testing-library/react';
import type {Virtualizer} from '@tanstack/react-virtual';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {createStore} from 'zustand/vanilla';

import type {UseMeetingListVirtualizer} from 'Components/meeting/meetingList/useMeetingListVirtualizer';
import type {MeetingStoreState} from 'Components/meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {isMeetingListItemLastInDay, MeetingList, type MeetingListProps} from './meetingList';

const createMeetingListVirtualizerForTest = (
  itemCount: number,
  getEstimatedItemHeight: (itemIndex: number) => number,
  startIndex = 0,
): Virtualizer<HTMLElement, Element> => {
  let startOffset = 0;
  const virtualItems = Array.from({length: itemCount}, (_unused, index) => {
    const itemIndex = startIndex + index;
    const size = getEstimatedItemHeight(itemIndex);
    const start = startOffset;
    startOffset += size;

    return {index: itemIndex, key: itemIndex, size, start};
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

const createUseMeetingListVirtualizerForTest = (): UseMeetingListVirtualizer => {
  return ({itemCount, getEstimatedItemHeight}) =>
    useMemo(
      () => createMeetingListVirtualizerForTest(itemCount, getEstimatedItemHeight),
      [itemCount, getEstimatedItemHeight],
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
    syncMeetingByQualifiedId: jest.fn(),
  }));

const renderMeetingList = (
  props: Omit<MeetingListProps, 'useMeetingListVirtualizer' | 'selfUser' | 'onRefresh'> &
    Partial<Pick<MeetingListProps, 'selfUser' | 'onRefresh'>>,
  wallClock = createDeterministicWallClock(),
  useMeetingListVirtualizer = createUseMeetingListVirtualizerForTest(),
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
          onRefresh={props.onRefresh ?? jest.fn()}
          selfUser={props.selfUser}
          useMeetingListVirtualizer={useMeetingListVirtualizer}
        />
      </MeetingStoreProvider>,
      rootProviderWrapper,
    ),
  );
};

describe('MeetingList', () => {
  it('shows a loading state before the first meetings response is received', () => {
    renderMeetingList({meetingSeries: [], isLoading: true, hasLoadError: false});

    expect(screen.getByTestId('status-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-meetings-list')).not.toBeInTheDocument();
  });

  it('shows the load error when the first load fails before any meetings are available', () => {
    renderMeetingList({meetingSeries: [], isLoading: false, hasLoadError: true});

    expect(screen.getByText('meetings.list.loadError')).toBeInTheDocument();
  });

  it('allows retrying after the meetings list fails to load', () => {
    const onRefresh = jest.fn();
    renderMeetingList({meetingSeries: [], isLoading: false, hasLoadError: true, onRefresh});

    act(() => {
      screen.getByRole('button', {name: 'meetings.list.refresh'}).click();
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
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

    expect(screen.getByText('Ongoing meeting')).toBeInTheDocument();
    expect(screen.getByText('Upcoming meeting')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: /meetings\.list\.today/})).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-uie-name="item-meeting"]')).toHaveLength(2);
    expect(screen.getByText('02:00 - 03:00 PM')).toBeInTheDocument();
  });

  it('renders completed meetings in the today section until local midnight', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date('2026-06-15T16:00:00.000Z').getTime(),
    });

    const createRelativeSeries = (startHour: number, endHour: number, title: string): MeetingSeries => {
      const start = new Date(wallClock.currentDate);
      start.setHours(startHour, 0, 0, 0);

      const end = new Date(start);
      end.setHours(endHour, 0, 0, 0);

      return createMeetingSeries(start.toISOString(), end.toISOString(), title);
    };

    const meetingSeries = [
      createRelativeSeries(14, 15, 'Completed meeting'),
      createRelativeSeries(17, 18, 'Upcoming meeting'),
    ];

    renderMeetingList({meetingSeries, isLoading: false, hasLoadError: false}, wallClock);

    expect(screen.getByRole('heading', {name: /meetings\.list\.today/})).toBeInTheDocument();
    expect(screen.getByText('Completed meeting')).toBeInTheDocument();
    expect(screen.getByText('Upcoming meeting')).toBeInTheDocument();
    expect(screen.getByText('02:00 - 03:00 PM')).toBeInTheDocument();
  });

  it('renders the next meeting even when it is more than one year away', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date('2026-06-15T12:00:00.000Z').getTime(),
    });

    const meetingSeries = [
      createMeetingSeries('2027-07-10T10:00:00.000Z', '2027-07-10T11:00:00.000Z', 'Far future meeting'),
    ];

    renderMeetingList({meetingSeries, isLoading: false, hasLoadError: false}, wallClock);

    expect(screen.getByText('Far future meeting')).toBeInTheDocument();
  });

  it('renders only virtualized entries when one day contains multiple meetings', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date('2026-06-15T12:00:00.000Z').getTime(),
    });
    const meetingSeries = [
      createMeetingSeries('2026-06-15T14:00:00.000Z', '2026-06-15T15:00:00.000Z', 'First meeting'),
      createMeetingSeries('2026-06-15T16:00:00.000Z', '2026-06-15T17:00:00.000Z', 'Second meeting'),
    ];
    const useFirstVirtualEntryOnly: UseMeetingListVirtualizer = ({getEstimatedItemHeight}) =>
      createMeetingListVirtualizerForTest(1, getEstimatedItemHeight);

    renderMeetingList({meetingSeries, isLoading: false, hasLoadError: false}, wallClock, useFirstVirtualEntryOnly);

    expect(screen.queryByText('First meeting')).not.toBeInTheDocument();
    expect(screen.queryByText('Second meeting')).not.toBeInTheDocument();
  });

  it('keeps the day description available when its virtualized heading is unmounted', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date('2026-06-15T12:00:00.000Z').getTime(),
    });
    const meetingSeries = [
      createMeetingSeries('2026-06-15T14:00:00.000Z', '2026-06-15T15:00:00.000Z', 'Visible meeting'),
    ];
    const useMeetingRowOnly: UseMeetingListVirtualizer = ({getEstimatedItemHeight}) =>
      createMeetingListVirtualizerForTest(1, getEstimatedItemHeight, 1);

    renderMeetingList({meetingSeries, isLoading: false, hasLoadError: false}, wallClock, useMeetingRowOnly);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    const meetingItem = screen.getByText('Visible meeting').closest('[aria-describedby]');
    const describedBy = meetingItem?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(/meetings\.list\.today/);
  });

  it('does not treat the page tail as last-in-day while more occurrences remain on the same day', () => {
    const day = new Date('2026-06-15T00:00:00.000Z');
    const dayHeader = {type: 'dayHeader' as const, day};
    const meetingItem = {
      type: 'meetingInstance' as const,
      day,
      meetingInstance: {
        meetingSeries: createMeetingSeries('2026-06-15T14:00:00.000Z', '2026-06-15T15:00:00.000Z', 'Boundary meeting'),
        start: new Date('2026-06-15T14:00:00.000Z'),
        end: new Date('2026-06-15T15:00:00.000Z'),
      },
    };

    expect(
      isMeetingListItemLastInDay({
        nextItem: undefined,
        hasMore: true,
        currentDay: day,
        nextPendingOccurrenceStart: new Date('2026-06-15T16:00:00.000Z'),
      }),
    ).toBe(false);
    expect(
      isMeetingListItemLastInDay({
        nextItem: undefined,
        hasMore: true,
        currentDay: day,
        nextPendingOccurrenceStart: new Date('2026-06-16T10:00:00.000Z'),
      }),
    ).toBe(true);
    expect(
      isMeetingListItemLastInDay({
        nextItem: undefined,
        hasMore: false,
        currentDay: day,
      }),
    ).toBe(true);
    expect(
      isMeetingListItemLastInDay({
        nextItem: dayHeader,
        hasMore: true,
        currentDay: day,
      }),
    ).toBe(true);
    expect(
      isMeetingListItemLastInDay({
        nextItem: meetingItem,
        hasMore: false,
        currentDay: day,
      }),
    ).toBe(false);
  });

  it('loads another occurrence page when the virtualized tail is reached', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date('2026-06-15T12:00:00.000Z').getTime(),
    });
    const meetingSeries = Array.from({length: 51}, (_unused, index) => {
      const start = new Date('2026-06-15T14:00:00.000Z');
      start.setDate(start.getDate() + index);
      const end = new Date(start);
      end.setHours(end.getHours() + 1);
      return createMeetingSeries(start.toISOString(), end.toISOString(), `Meeting ${index + 1}`);
    });
    const scrollElement = document.createElement('div');
    Object.defineProperties(scrollElement, {
      scrollTop: {value: 900, configurable: true},
      clientHeight: {value: 100, configurable: true},
      scrollHeight: {value: 1000, configurable: true},
    });
    const scrollElementRef = {current: scrollElement};

    renderMeetingList({meetingSeries, isLoading: false, hasLoadError: false, scrollElementRef}, wallClock);
    expect(screen.queryByText('Meeting 51')).not.toBeInTheDocument();

    act(() => {
      fireEvent.scroll(scrollElement);
      wallClock.advanceByMilliseconds(100);
    });

    expect(screen.getByText('Meeting 51')).toBeInTheDocument();
  });
});
