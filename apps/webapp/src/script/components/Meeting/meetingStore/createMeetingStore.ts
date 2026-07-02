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

import {Result, result} from 'true-myth';
import {createStore, type StoreApi} from 'zustand/vanilla';

import {loadMeetingsList, type MeetingsListErrorKey} from 'Components/Meeting/loadMeetingsList';
import {mapMeetingToScheduleFormState} from 'Components/Meeting/mapMeetingToScheduleFormState';
import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {
  scheduleMeeting as scheduleMeetingTask,
  updateMeeting as updateMeetingTask,
  type MeetingSubmitSuccess,
  type UpdateMeetingParams,
} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingService';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import type {User} from 'Repositories/entity/User';

import type {MeetingStoreDeps} from './meetingStoreDeps';

export type EditMeetingData = {
  formState: ScheduleMeetingFormState;
  qualifiedConversation: Meeting['qualified_conversation'];
  originalSelectedUsers: User[];
};

export type MeetingStoreState = {
  meetings: Meeting[];
  isLoading: boolean;
  errorKey: MeetingsListErrorKey | undefined;
  loadMeetings: () => Promise<void>;
  scheduleMeeting: (formState: ScheduleMeetingFormState) => Promise<Result<MeetingSubmitSuccess, MeetingSubmitErrors>>;
  updateMeeting: (params: UpdateMeetingParams) => Promise<Result<MeetingSubmitSuccess, MeetingSubmitErrors>>;
  loadMeetingForEdit: (meeting: Meeting) => Promise<Result<EditMeetingData, MeetingSubmitErrors>>;
};

export type MeetingStore = StoreApi<MeetingStoreState>;

type MeetingStoreInitialState = Partial<Pick<MeetingStoreState, 'meetings' | 'isLoading' | 'errorKey'>>;

const refreshMeetingsAfterSubmit = async (
  loadMeetings: () => Promise<void>,
  getErrorKey: () => MeetingsListErrorKey | undefined,
): Promise<Result<void, MeetingSubmitErrors>> => {
  await loadMeetings();

  if (getErrorKey() !== undefined) {
    return result.err(meetingSubmitErrors.refreshFailed);
  }

  return result.ok(undefined);
};

export const createMeetingStore = (deps: MeetingStoreDeps, initialState?: MeetingStoreInitialState): MeetingStore =>
  createStore<MeetingStoreState>((set, get) => ({
    meetings: initialState?.meetings ?? [],
    isLoading: initialState?.isLoading ?? false,
    errorKey: initialState?.errorKey,
    loadMeetings: async () => {
      set({isLoading: true, errorKey: undefined});

      const listResult = await loadMeetingsList(deps.meetingsRepository);

      set({meetings: listResult.meetings, errorKey: listResult.errorKey, isLoading: false});
    },
    scheduleMeeting: async formState => {
      const submitResult = await scheduleMeetingTask(formState, deps);

      if (submitResult.isErr) {
        return result.err(submitResult.error);
      }

      const refreshResult = await refreshMeetingsAfterSubmit(get().loadMeetings, () => get().errorKey);

      if (refreshResult.isErr) {
        return result.err(refreshResult.error);
      }

      return result.ok(submitResult.value);
    },
    updateMeeting: async params => {
      const submitResult = await updateMeetingTask(params, deps);

      if (submitResult.isErr) {
        return result.err(submitResult.error);
      }

      const refreshResult = await refreshMeetingsAfterSubmit(get().loadMeetings, () => get().errorKey);

      if (refreshResult.isErr) {
        return result.err(refreshResult.error);
      }

      return result.ok(submitResult.value);
    },
    loadMeetingForEdit: async meeting => {
      const conversationResult = await deps.conversationRepository.safeGetConversationById(
        meeting.qualified_conversation,
      );

      if (conversationResult.isErr) {
        return result.err(meetingSubmitErrors.updateFailed);
      }

      const selectedUsers = [...conversationResult.value.participating_user_ets()];
      const formState = mapMeetingToScheduleFormState(meeting, selectedUsers);

      return result.ok({
        formState,
        qualifiedConversation: meeting.qualified_conversation,
        originalSelectedUsers: selectedUsers,
      });
    },
  }));
