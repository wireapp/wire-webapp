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

import {useEffect, useState, type KeyboardEvent} from 'react';

import {isUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {isValidEmail} from '../../../util/validationUtil';

export type MeetingEmailError = 'invalid' | 'duplicate';

interface UseMeetingEmailInviteesOptions {
  invitedEmails?: string[];
  onInvitedEmailsChange?: (emails: string[]) => void;
  onFilterChange: (filter: string) => void;
  isOpen: boolean;
}

interface UseMeetingEmailInviteesResult {
  emailError: Maybe<MeetingEmailError>;
  clearEmailError: () => void;
  handleEmailKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  selectEmail: (email: string) => void;
  removeEmail: (email: string) => void;
}

export const useMeetingEmailInvitees = ({
  invitedEmails = [],
  onInvitedEmailsChange,
  onFilterChange,
  isOpen,
}: UseMeetingEmailInviteesOptions): UseMeetingEmailInviteesResult => {
  const [emailError, setEmailError] = useState<Maybe<MeetingEmailError>>(Maybe.nothing());

  useEffect(() => {
    if (!isOpen) {
      setEmailError(Maybe.nothing());
    }
  }, [isOpen]);

  const selectEmail = (value: string): void => {
    if (isUndefined(onInvitedEmailsChange)) {
      return;
    }
    const email = value.trim();
    if (!email.includes('@')) {
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError(Maybe.just('invalid'));
      return;
    }
    if (
      invitedEmails.some(existing => {
        return existing.toLowerCase() === email.toLowerCase();
      })
    ) {
      setEmailError(Maybe.just('duplicate'));
      return;
    }

    onInvitedEmailsChange([...invitedEmails, email]);
    onFilterChange('');
    setEmailError(Maybe.nothing());
  };

  const handleEmailKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter' || isUndefined(onInvitedEmailsChange)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    selectEmail(event.currentTarget.value);
  };

  const removeEmail = (email: string): void => {
    onInvitedEmailsChange?.(
      invitedEmails.filter(item => {
        return item !== email;
      }),
    );
  };

  return {
    emailError,
    clearEmailError: () => {
      setEmailError(Maybe.nothing());
    },
    handleEmailKeyDown,
    selectEmail,
    removeEmail,
  };
};
