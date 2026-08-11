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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {task, type Task} from 'true-myth';
import {createStore, type StoreApi} from 'zustand/vanilla';

import {loadMeetingsList} from 'Components/Meeting/loadMeetingsList';
import {mapApiMeetingToSeries} from 'Components/Meeting/mapApiMeetingToSeries';
import {mapMeetingInstanceToScheduleFormState} from 'Components/Meeting/mapMeetingInstanceToScheduleFormState';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import type {DeleteMeetingCommand} from 'Components/Meeting/shared/service/deleteMeeting';
import {type CreateMeetingSuccess, type MeetingSubmitSuccess} from 'Components/Meeting/shared/service/meetingService';
import type {
  MeetNowMeetingCommand,
  ScheduleMeetingCommand,
  UpdateMeetingCommand,
} from 'Components/Meeting/shared/types/meetingCommandTypes';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {toMeetingIdKey} from 'Components/Meeting/utils/toMeetingIdKey';
import type {User} from 'Repositories/entity/User';
import {getLogger} from 'Util/logger';
import {matchQualifiedIds} from 'Util/qualifiedId';

import type {MeetingStoreDeps} from './meetingStoreDeps';

const logger = getLogger('createMeetingStore');

const toDeleteMeetingCommand = (meetingInstance: MeetingInstance): DeleteMeetingCommand => ({
  meetingId: meetingInstance.meetingSeries.qualified_id,
  qualifiedConversation: meetingInstance.meetingSeries.qualified_conversation,
});

const filterOutMeetingSeries = (meetingSeries: MeetingSeries[], meetingId: QualifiedId): MeetingSeries[] =>
  meetingSeries.filter(series => !matchQualifiedIds(series.qualified_id, meetingId));

const upsertMeetingSeries = (meetingSeries: MeetingSeries[], updatedSeries: MeetingSeries): MeetingSeries[] => [
  ...meetingSeries.filter(series => !matchQualifiedIds(series.qualified_id, updatedSeries.qualified_id)),
  updatedSeries,
];

export const syncMeetingErrors = {
  fetchFailed: 'fetchFailed',
  mapFailed: 'mapFailed',
} as const;

export type SyncMeetingError = (typeof syncMeetingErrors)[keyof typeof syncMeetingErrors];

export type SyncMeetingResult = {
  meeting: MeetingSeries;
  applied: boolean;
};

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
  scheduleMeeting: (command: ScheduleMeetingCommand) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
  meetNowMeeting: (command: MeetNowMeetingCommand) => Task<CreateMeetingSuccess, MeetingSubmitErrors>;
  updateMeeting: (command: UpdateMeetingCommand) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
  deleteMeetingForMe: (meetingInstance: MeetingInstance) => Task<void, MeetingSubmitErrors>;
  deleteMeetingForAll: (meetingInstance: MeetingInstance) => Task<void, MeetingSubmitErrors>;
  removeMeetingByQualifiedId: (meetingId: QualifiedId) => void;
  syncMeetingByQualifiedId: (meetingId: QualifiedId) => Task<SyncMeetingResult, SyncMeetingError>;
  loadMeetingForEdit: (meetingInstance: MeetingInstance) => Task<EditMeetingData, MeetingSubmitErrors>;
};

export type MeetingStore = StoreApi<MeetingStoreState>;

type MeetingStoreInitialState = Partial<Pick<MeetingStoreState, 'meetingSeries' | 'isLoading' | 'hasLoadError'>>;

export const createMeetingStore = (deps: MeetingStoreDeps, initialState?: MeetingStoreInitialState): MeetingStore => {
  const meetingMutationVersions = new Map<string, number>();
  let meetingStoreMutationVersion = 0;
  const getMeetingMutationVersion = (meetingId: QualifiedId): number =>
    meetingMutationVersions.get(toMeetingIdKey(meetingId)) ?? 0;
  const incrementMeetingMutationVersion = (meetingId: QualifiedId): void => {
    const meetingIdKey = toMeetingIdKey(meetingId);
    meetingMutationVersions.set(meetingIdKey, getMeetingMutationVersion(meetingId) + 1);
    meetingStoreMutationVersion += 1;
  };

  return createStore<MeetingStoreState>((set, get) => ({
    meetingSeries: initialState?.meetingSeries ?? [],
    isLoading: initialState?.isLoading ?? false,
    hasLoadError: initialState?.hasLoadError ?? false,
    loadMeetings: async () => {
      const mutationVersionBeforeFetch = meetingStoreMutationVersion;
      const hasExistingMeetings = get().meetingSeries.length > 0;

      if (hasExistingMeetings) {
        set({hasLoadError: false});
      } else {
        set({isLoading: true, hasLoadError: false});
      }

      const listResult = await loadMeetingsList(deps.meetingsRepository);

      if (meetingStoreMutationVersion !== mutationVersionBeforeFetch) {
        set({isLoading: false});
        return;
      }

      set({meetingSeries: listResult.meetingSeries, hasLoadError: listResult.hasLoadError, isLoading: false});
    },
    scheduleMeeting: command =>
      deps.serviceTasks.scheduleMeeting(command).andThen(result =>
        get()
          .syncMeetingByQualifiedId(result.qualifiedMeetingId)
          .map(() => ({failedToAdd: result.failedToAdd}))
          .orElse(() => task.resolve({failedToAdd: result.failedToAdd})),
      ),
    meetNowMeeting: deps.serviceTasks.meetNowMeeting,
    updateMeeting: deps.serviceTasks.updateMeeting,
    deleteMeetingForMe: meetingInstance =>
      deps.serviceTasks.deleteMeetingForMe(toDeleteMeetingCommand(meetingInstance)),
    deleteMeetingForAll: meetingInstance =>
      deps.serviceTasks.deleteMeetingForAll(toDeleteMeetingCommand(meetingInstance)),
    removeMeetingByQualifiedId: meetingId => {
      incrementMeetingMutationVersion(meetingId);
      set(state => ({
        meetingSeries: filterOutMeetingSeries(state.meetingSeries, meetingId),
      }));
    },
    syncMeetingByQualifiedId: meetingId => {
      const mutationVersionBeforeFetch = getMeetingMutationVersion(meetingId);

      return deps.meetingsRepository
        .getMeeting(meetingId)
        .mapRejected((error): SyncMeetingError => {
          logger.warn('Failed to fetch meeting for sync', {error, qualifiedId: meetingId});
          return syncMeetingErrors.fetchFailed;
        })
        .andThen(apiMeeting => {
          const mapResult = mapApiMeetingToSeries(apiMeeting);

          if (mapResult.isErr) {
            logger.warn('Failed to map fetched meeting for sync', {
              error: mapResult.error,
              qualifiedId: meetingId,
            });
            return task.reject<SyncMeetingResult, SyncMeetingError>(syncMeetingErrors.mapFailed);
          }

          return task.resolve<SyncMeetingResult, SyncMeetingError>({meeting: mapResult.value, applied: false});
        })
        .map(({meeting}) => {
          const applied = getMeetingMutationVersion(meetingId) === mutationVersionBeforeFetch;
          if (applied) {
            set(state => ({meetingSeries: upsertMeetingSeries(state.meetingSeries, meeting)}));
            meetingStoreMutationVersion += 1;
          }

          return {meeting, applied};
        });
    },
    loadMeetingForEdit: meetingInstance => {
      const {meetingSeries} = meetingInstance;

      return deps.conversationRepository
        .safeGetConversationById(meetingSeries.qualified_conversation)
        .mapRejected(() => meetingSubmitErrors.updateFailed)
        .map(conversation => {
          const selectedUsers = [...conversation.participating_user_ets()];
          const formState = mapMeetingInstanceToScheduleFormState(meetingInstance, selectedUsers, deps.wallClock);

          return {
            formState,
            qualifiedConversation: meetingSeries.qualified_conversation,
            originalSelectedUsers: selectedUsers,
          };
        });
    },
  }));
};
