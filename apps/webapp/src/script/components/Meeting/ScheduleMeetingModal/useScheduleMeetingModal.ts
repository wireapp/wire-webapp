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

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {Maybe, maybe} from 'true-myth';
import {create} from 'zustand';

import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import type {User} from 'Repositories/entity/User';

import {
  getDefaultMeetingEndDateTime,
  getDefaultScheduleMeetingStartDateTime,
  resolveEndChange,
  resolveStartChange,
} from 'Components/Meeting/shared/defaults/meetingDateTimeDefaults';
import type {
  ScheduleMeetingFormErrors,
  ScheduleMeetingFormState,
  ScheduleMeetingMode,
  ScheduleMeetingRecurrenceOption,
} from './scheduleMeetingTypes';
import {hasScheduleMeetingFormErrors, validateScheduleMeetingForm} from './scheduleMeetingValidation';

export type {
  ScheduleMeetingFormErrors,
  ScheduleMeetingFormState,
  ScheduleMeetingRecurrenceOption,
} from './scheduleMeetingTypes';
export type {ScheduleMeetingMode as ScheduleMeetingModalMode} from './scheduleMeetingTypes';

export {hasScheduleMeetingFormErrors, validateScheduleMeetingForm};

export const getDefaultScheduleMeetingFormState = (wallClock: WallClock): ScheduleMeetingFormState => {
  const start = getDefaultScheduleMeetingStartDateTime(wallClock);
  return {
    title: '',
    start: maybe.just(start),
    end: maybe.just(getDefaultMeetingEndDateTime(start)),
    recurrence: 'doesNotRepeat',
    selectedUsers: [],
    participantsFilter: '',
  };
};

type ScheduleMeetingModalState = {
  isOpen: boolean;
  mode: ScheduleMeetingMode;
  formState: ScheduleMeetingFormState;
  errors: ScheduleMeetingFormErrors;
  editingMeetingId: Maybe<QualifiedId>;
  qualifiedConversation: Maybe<QualifiedId>;
  originalRecurrence: ScheduleMeetingRecurrenceOption;
  originalSelectedUsers: User[];
  openCreate: (wallClock: WallClock) => void;
  openEdit: (
    meetingSeries: MeetingSeries,
    formState: ScheduleMeetingFormState,
    qualifiedConversation: QualifiedId,
    originalSelectedUsers: User[],
  ) => void;
  close: () => void;
  reset: (wallClock: WallClock) => void;
  setTitle: (title: string) => void;
  setStart: (start: Maybe<Date>) => void;
  setEnd: (end: Maybe<Date>) => void;
  setRecurrence: (recurrence: ScheduleMeetingRecurrenceOption) => void;
  setSelectedUsers: (selectedUsers: User[]) => void;
  setParticipantsFilter: (participantsFilter: string) => void;
  validate: (wallClock: WallClock) => ScheduleMeetingFormErrors;
  clearErrors: () => void;
};

const emptyFormState: ScheduleMeetingFormState = {
  title: '',
  start: maybe.nothing(),
  end: maybe.nothing(),
  recurrence: 'doesNotRepeat',
  selectedUsers: [],
  participantsFilter: '',
};

const initialState = {
  isOpen: false,
  mode: 'create' as ScheduleMeetingMode,
  formState: emptyFormState,
  errors: {} as ScheduleMeetingFormErrors,
  editingMeetingId: Maybe.nothing<QualifiedId>(),
  qualifiedConversation: Maybe.nothing<QualifiedId>(),
  originalRecurrence: 'doesNotRepeat' as ScheduleMeetingRecurrenceOption,
  originalSelectedUsers: [] as User[],
};

export const useScheduleMeetingModal = create<ScheduleMeetingModalState>((set, get) => ({
  ...initialState,
  openCreate: wallClock =>
    set({
      isOpen: true,
      mode: 'create',
      formState: getDefaultScheduleMeetingFormState(wallClock),
      errors: {},
      editingMeetingId: Maybe.nothing(),
      qualifiedConversation: Maybe.nothing(),
      originalRecurrence: 'doesNotRepeat',
      originalSelectedUsers: [],
    }),
  openEdit: (
    meetingSeries: MeetingSeries,
    formState: ScheduleMeetingFormState,
    qualifiedConversation: QualifiedId,
    originalSelectedUsers: User[],
  ) =>
    set({
      isOpen: true,
      mode: 'edit',
      formState,
      errors: {},
      editingMeetingId: maybe.just(meetingSeries.qualified_id),
      qualifiedConversation: maybe.just(qualifiedConversation),
      originalRecurrence: formState.recurrence,
      originalSelectedUsers,
    }),
  close: () =>
    set({
      isOpen: false,
      qualifiedConversation: Maybe.nothing(),
      originalRecurrence: 'doesNotRepeat',
      originalSelectedUsers: [],
    }),
  reset: wallClock => set({...initialState, formState: getDefaultScheduleMeetingFormState(wallClock)}),
  setTitle: title =>
    set(state => ({
      formState: {...state.formState, title},
      errors: {...state.errors, title: undefined},
    })),
  setStart: start =>
    set(state => {
      if (start.isNothing) {
        return {
          formState: {...state.formState, start},
          errors: {...state.errors, startInPast: undefined, endBeforeStart: undefined},
        };
      }

      const nextFormState = {...state.formState};

      if (state.formState.end.isJust && state.formState.start.isJust) {
        const resolved = resolveStartChange(state.formState.start.value, state.formState.end.value, start.value);
        nextFormState.start = maybe.just(resolved.start);
        nextFormState.end = maybe.just(resolved.end);
      } else {
        nextFormState.start = start;
        nextFormState.end = maybe.just(getDefaultMeetingEndDateTime(start.value));
      }

      return {
        formState: nextFormState,
        errors: {...state.errors, startInPast: undefined, endBeforeStart: undefined},
      };
    }),
  setEnd: end =>
    set(state => {
      if (end.isNothing) {
        return {
          formState: {...state.formState, end},
          errors: {...state.errors, endInPast: undefined, endBeforeStart: undefined},
        };
      }

      const nextFormState = {...state.formState};

      if (state.formState.start.isJust) {
        const previousStart = state.formState.start.value;
        const previousEnd = state.formState.end.unwrapOr(getDefaultMeetingEndDateTime(previousStart));
        const resolved = resolveEndChange(previousStart, previousEnd, end.value);
        nextFormState.start = maybe.just(resolved.start);
        nextFormState.end = maybe.just(resolved.end);
      } else {
        nextFormState.end = end;
      }

      return {
        formState: nextFormState,
        errors: {...state.errors, endInPast: undefined, endBeforeStart: undefined, startInPast: undefined},
      };
    }),
  setRecurrence: recurrence => set(state => ({formState: {...state.formState, recurrence}})),
  setSelectedUsers: selectedUsers => set(state => ({formState: {...state.formState, selectedUsers}})),
  setParticipantsFilter: participantsFilter => set(state => ({formState: {...state.formState, participantsFilter}})),
  validate: wallClock => {
    const {title, start, end} = get().formState;
    const errors = validateScheduleMeetingForm({title, start, end, wallClock});
    set({errors});
    return errors;
  },
  clearErrors: () => set({errors: {}}),
}));
