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

import type {Task} from 'true-myth';
import {createStore, type StoreApi} from 'zustand/vanilla';

import {loadMeetingsList} from 'Components/Meeting/loadMeetingsList';
import {mapMeetingInstanceToScheduleFormState} from 'Components/Meeting/mapMeetingInstanceToScheduleFormState';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {
  scheduleMeeting as scheduleMeetingTask,
  updateMeeting as updateMeetingTask,
  type MeetingSubmitSuccess,
  type UpdateMeetingParams,
} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingService';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import type {User} from 'Repositories/entity/User';

import type {MeetingStoreDeps} from './meetingStoreDeps';

export type EditMeetingData = {
  formState: ScheduleMeetingFormState;
  qualifiedConversation: MeetingSeries['qualified_conversation'];
  originalSelectedUsers: User[];
};

export type MeetingStoreState = {
  meetingSeries: MeetingSeries[];
  isLoading: boolean;
  hasLoadError: boolean;
  loadMeetings: () => Promise<void>;
  scheduleMeeting: (formState: ScheduleMeetingFormState) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
  updateMeeting: (params: UpdateMeetingParams) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
  loadMeetingForEdit: (meetingInstance: MeetingInstance) => Task<EditMeetingData, MeetingSubmitErrors>;
};

export type MeetingStore = StoreApi<MeetingStoreState>;

type MeetingStoreInitialState = Partial<Pick<MeetingStoreState, 'meetingSeries' | 'isLoading' | 'hasLoadError'>>;

export const createMeetingStore = (deps: MeetingStoreDeps, initialState?: MeetingStoreInitialState): MeetingStore =>
  createStore<MeetingStoreState>(set => ({
    meetingSeries: initialState?.meetingSeries ?? [],
    isLoading: initialState?.isLoading ?? false,
    hasLoadError: initialState?.hasLoadError ?? false,
    loadMeetings: async () => {
      set({isLoading: true, hasLoadError: false});

      const listResult = await loadMeetingsList(deps.meetingsRepository);

      set({meetingSeries: listResult.meetingSeries, hasLoadError: listResult.hasLoadError, isLoading: false});
    },
    scheduleMeeting: formState => scheduleMeetingTask(formState, deps),
    updateMeeting: params => updateMeetingTask(params, deps),
    loadMeetingForEdit: meetingInstance => {
      const {meetingSeries} = meetingInstance;

      return deps.conversationRepository
        .safeGetConversationById(meetingSeries.qualified_conversation)
        .mapRejected(() => meetingSubmitErrors.updateFailed)
        .map(conversation => {
          const selectedUsers = [...conversation.participating_user_ets()];
          const formState = mapMeetingInstanceToScheduleFormState(meetingInstance, selectedUsers);

          return {
            formState,
            qualifiedConversation: meetingSeries.qualified_conversation,
            originalSelectedUsers: selectedUsers,
          };
        });
    },
  }));
