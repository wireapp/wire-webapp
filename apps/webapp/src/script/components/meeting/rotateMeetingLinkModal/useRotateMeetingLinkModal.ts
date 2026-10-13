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
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {create} from 'zustand';

import {
  getMeetingPasswordErrors,
  type MeetingPasswordErrors,
} from 'Components/meeting/shared/validation/meetingPasswordValidation';

type RotateMeetingLinkModalState = {
  isOpen: boolean;
  meetingId?: QualifiedId;
  password: string;
  passwordConfirmation: string;
  errors: MeetingPasswordErrors;
  isSubmitting: boolean;
  error?: string;
  open: (meetingId: QualifiedId) => void;
  close: () => void;
  reset: () => void;
  setPassword: (password: string) => void;
  setPasswordConfirmation: (passwordConfirmation: string) => void;
  startSubmitting: () => void;
  setFailure: (error: string) => void;
};

const emptyErrors = (): MeetingPasswordErrors => {
  return {password: undefined, passwordConfirmation: undefined};
};

const initialState = {
  isOpen: false,
  meetingId: undefined,
  password: '',
  passwordConfirmation: '',
  errors: emptyErrors(),
  isSubmitting: false,
  error: undefined,
};

export const useRotateMeetingLinkModal = create<RotateMeetingLinkModalState>((set, get) => {
  return {
    ...initialState,
    open: meetingId => {
      return set({...initialState, isOpen: true, meetingId});
    },
    close: () => {
      return set({isOpen: false});
    },
    reset: () => {
      return set(initialState);
    },
    setPassword: password => {
      return set({password, errors: getMeetingPasswordErrors(password, get().passwordConfirmation)});
    },
    setPasswordConfirmation: passwordConfirmation => {
      return set({passwordConfirmation, errors: getMeetingPasswordErrors(get().password, passwordConfirmation)});
    },
    startSubmitting: () => {
      return set({isSubmitting: true, error: undefined});
    },
    setFailure: error => {
      return set({isSubmitting: false, error});
    },
  };
});

export const hasRotateMeetingLinkFormErrors = (errors: MeetingPasswordErrors): boolean => {
  return !isUndefined(errors.password) || !isUndefined(errors.passwordConfirmation);
};
