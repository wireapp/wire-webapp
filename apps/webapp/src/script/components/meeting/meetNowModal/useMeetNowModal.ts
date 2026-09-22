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

import {isUndefined} from '@sindresorhus/is';
import {result, type Result} from 'true-myth';
import {create} from 'zustand';

import {getMeetingPasswordErrors} from 'Components/meeting/shared/validation/meetingPasswordValidation';
import {
  getMeetingTitleError,
  getMeetingTitleInputError,
} from 'Components/meeting/shared/validation/meetingTitleValidation';
import type {User} from 'Repositories/entity/User';

import {emptyMeetNowFormErrors, type MeetNowFormErrors, type MeetNowFormState} from './meetNowTypes';

export type {MeetNowFormErrors, MeetNowFormState} from './meetNowTypes';

export const getDefaultMeetNowFormState = (): MeetNowFormState => ({
  title: '',
  selectedUsers: [],
  participantsFilter: '',
  password: '',
  passwordConfirmation: '',
});

type MeetNowModalState = {
  isOpen: boolean;
  formState: MeetNowFormState;
  errors: MeetNowFormErrors;
  open: () => void;
  close: () => void;
  reset: () => void;
  setTitle: (title: string) => void;
  setSelectedUsers: (selectedUsers: User[]) => void;
  setParticipantsFilter: (participantsFilter: string) => void;
  setPassword: (password: string) => void;
  setPasswordConfirmation: (passwordConfirmation: string) => void;
  validate: () => MeetNowFormErrors;
  clearErrors: () => void;
};

const initialState = {
  isOpen: false,
  formState: getDefaultMeetNowFormState(),
  errors: emptyMeetNowFormErrors(),
};

export const getMeetNowFormErrors = ({title, password, passwordConfirmation}: MeetNowFormState): MeetNowFormErrors => ({
  title: getMeetingTitleError(title),
  ...getMeetingPasswordErrors(password, passwordConfirmation),
});

export const hasMeetNowFormErrors = (errors: MeetNowFormErrors): boolean =>
  !isUndefined(errors.title) || !isUndefined(errors.password) || !isUndefined(errors.passwordConfirmation);

export const validateMeetNowForm = (formState: MeetNowFormState): Result<MeetNowFormState, MeetNowFormErrors> => {
  const errors = getMeetNowFormErrors(formState);

  if (hasMeetNowFormErrors(errors)) {
    return result.err(errors);
  }

  return result.ok(formState);
};

export const useMeetNowModal = create<MeetNowModalState>((set, get) => ({
  ...initialState,
  open: () =>
    set({
      isOpen: true,
      formState: getDefaultMeetNowFormState(),
      errors: emptyMeetNowFormErrors(),
    }),
  close: () => set({isOpen: false}),
  reset: () =>
    set({
      formState: getDefaultMeetNowFormState(),
      errors: emptyMeetNowFormErrors(),
    }),
  setTitle: title =>
    set(state => ({
      formState: {...state.formState, title},
      errors: {...state.errors, title: getMeetingTitleInputError(title)},
    })),
  setSelectedUsers: selectedUsers =>
    set(state => ({
      formState: {...state.formState, selectedUsers},
    })),
  setParticipantsFilter: participantsFilter =>
    set(state => ({
      formState: {...state.formState, participantsFilter},
    })),
  setPassword: password =>
    set(state => ({
      formState: {...state.formState, password},
      errors: {...state.errors, ...getMeetingPasswordErrors(password, state.formState.passwordConfirmation)},
    })),
  setPasswordConfirmation: passwordConfirmation =>
    set(state => ({
      formState: {...state.formState, passwordConfirmation},
      errors: {...state.errors, ...getMeetingPasswordErrors(state.formState.password, passwordConfirmation)},
    })),
  validate: () => {
    const errors = getMeetNowFormErrors(get().formState);
    set({errors});
    return errors;
  },
  clearErrors: () => set({errors: emptyMeetNowFormErrors()}),
}));
