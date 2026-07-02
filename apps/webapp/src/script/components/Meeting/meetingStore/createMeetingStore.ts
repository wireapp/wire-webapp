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

import {createStore, type StoreApi} from 'zustand/vanilla';

import {loadMeetingsList, type MeetingsListErrorKey} from 'Components/Meeting/loadMeetingsList';
import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';

import type {MeetingStoreDeps} from './meetingStoreDeps';

export type MeetingStoreState = {
  meetings: Meeting[];
  isLoading: boolean;
  errorKey: MeetingsListErrorKey | undefined;
  loadMeetings: () => Promise<void>;
};

export type MeetingStore = StoreApi<MeetingStoreState>;

type MeetingStoreInitialState = Partial<Pick<MeetingStoreState, 'meetings' | 'isLoading' | 'errorKey'>>;

export const createMeetingStore = (deps: MeetingStoreDeps, initialState?: MeetingStoreInitialState): MeetingStore =>
  createStore<MeetingStoreState>(set => ({
    meetings: initialState?.meetings ?? [],
    isLoading: initialState?.isLoading ?? false,
    errorKey: initialState?.errorKey,
    loadMeetings: async () => {
      set({isLoading: true, errorKey: undefined});

      const result = await loadMeetingsList(deps.meetingsRepository);

      set({meetings: result.meetings, errorKey: result.errorKey, isLoading: false});
    },
  }));
