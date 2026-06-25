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

import is from '@sindresorhus/is';
import {maybe} from 'true-myth';

import type {Meeting} from 'Components/meeting/meetingList/meetingList';
import type {ScheduleMeetingFormState} from 'Components/meeting/scheduleMeetingModal/scheduleMeetingTypes';
import {User} from 'Repositories/entity/User';
import {translate} from 'Util/localizerUtil';

const createPlaceholderUserForEmail = (email: string): User => {
  const user = new User(`email:${email}`, 'local', translate);
  user.name(email);
  user.email(email);
  return user;
};

const resolveInvitedEmailsToUsers = (invitedEmails: string[], availableUsers: User[]): User[] =>
  invitedEmails.map(email => {
    const normalizedEmail = email.trim().toLowerCase();
    const matchedUser = availableUsers.find(user => {
      const userEmail = user.email();
      return is.nonEmptyString(userEmail) && userEmail.toLowerCase() === normalizedEmail;
    });

    return matchedUser ?? createPlaceholderUserForEmail(email);
  });

export const mapMeetingToScheduleFormState = (meeting: Meeting, availableUsers: User[]): ScheduleMeetingFormState => ({
  title: meeting.title,
  start: maybe.just(new Date(meeting.start_date)),
  end: maybe.just(new Date(meeting.end_date)),
  recurrence: meeting.recurrence,
  selectedUsers: resolveInvitedEmailsToUsers(meeting.invited_emails, availableUsers),
  participantsFilter: '',
});
