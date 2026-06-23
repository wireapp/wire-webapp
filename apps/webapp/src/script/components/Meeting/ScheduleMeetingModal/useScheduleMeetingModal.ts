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
import {Maybe, maybe} from 'true-myth';
import {create} from 'zustand';

import {getNextHourDateTime} from '@wireapp/react-ui-kit';

import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import type {User} from 'Repositories/entity/User';

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

const MEETING_DURATION_MINUTES = 30;

const getDefaultEndDateTime = (start: Date): Date => {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + MEETING_DURATION_MINUTES);
  return end;
};

export const getDefaultScheduleMeetingFormState = (): ScheduleMeetingFormState => {
  const start = getNextHourDateTime();
  return {
    title: '',
    start: maybe.just(start),
    end: maybe.just(getDefaultEndDateTime(start)),
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
  originalInvitedEmails: string[];
  openCreate: () => void;
  openEdit: (meeting: Meeting, formState: ScheduleMeetingFormState) => void;
  close: () => void;
  reset: () => void;
  setTitle: (title: string) => void;
  setStart: (start: Maybe<Date>) => void;
  setEnd: (end: Maybe<Date>) => void;
  setRecurrence: (recurrence: ScheduleMeetingRecurrenceOption) => void;
  setSelectedUsers: (selectedUsers: User[]) => void;
  setParticipantsFilter: (participantsFilter: string) => void;
  validate: () => ScheduleMeetingFormErrors;
  clearErrors: () => void;
};

const initialState = {
  isOpen: false,
  mode: 'create' as ScheduleMeetingMode,
  formState: getDefaultScheduleMeetingFormState(),
  errors: {} as ScheduleMeetingFormErrors,
  editingMeetingId: Maybe.nothing<QualifiedId>(),
  originalInvitedEmails: [] as string[],
};

export const useScheduleMeetingModal = create<ScheduleMeetingModalState>((set, get) => ({
  ...initialState,
  openCreate: () =>
    set({
      isOpen: true,
      mode: 'create',
      formState: getDefaultScheduleMeetingFormState(),
      errors: {},
      editingMeetingId: Maybe.nothing(),
      originalInvitedEmails: [],
    }),
  openEdit: (meeting: Meeting, formState: ScheduleMeetingFormState) =>
    set({
      isOpen: true,
      mode: 'edit',
      formState,
      errors: {},
      editingMeetingId: maybe.just(meeting.qualified_id),
      originalInvitedEmails: meeting.invited_emails,
    }),
  close: () => set({isOpen: false}),
  reset: () => set({...initialState, formState: getDefaultScheduleMeetingFormState()}),
  setTitle: title =>
    set(state => ({
      formState: {...state.formState, title},
      errors: {...state.errors, title: undefined},
    })),
  setStart: start =>
    set(state => ({
      formState: {...state.formState, start},
      errors: {...state.errors, endBeforeStart: undefined},
    })),
  setEnd: end =>
    set(state => ({
      formState: {...state.formState, end},
      errors: {...state.errors, endBeforeStart: undefined},
    })),
  setRecurrence: recurrence => set(state => ({formState: {...state.formState, recurrence}})),
  setSelectedUsers: selectedUsers => set(state => ({formState: {...state.formState, selectedUsers}})),
  setParticipantsFilter: participantsFilter => set(state => ({formState: {...state.formState, participantsFilter}})),
  validate: () => {
    const {title, start, end} = get().formState;
    const errors = validateScheduleMeetingForm({title, start, end});
    set({errors});
    return errors;
  },
  clearErrors: () => set({errors: {}}),
}));
