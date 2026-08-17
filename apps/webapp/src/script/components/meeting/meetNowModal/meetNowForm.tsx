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

import {type FormEvent, useEffect, useRef} from 'react';

import {isNonEmptyString} from '@sindresorhus/is';

import {CircleCloseIcon, ErrorMessage, getOverlayPortalContainer, Input} from '@wireapp/react-ui-kit';

import {MeetingParticipantsPicker} from 'Components/meeting/meetingParticipantsPicker';
import {useMeetingParticipants} from 'Components/meeting/shared/participants/useMeetingParticipants';
import {
  scheduleMeetingParticipantsSectionCss,
  scheduleMeetingTitleClearButtonStyles,
  scheduleMeetingTitleInputStyles,
  scheduleMeetingTitleInputWrapperStyles,
} from 'Components/meeting/shared/styles/meetingForm.styles';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {meetNowFormLayoutStyles} from './meetNowModal.styles';
import type {MeetNowFormState} from './meetNowTypes';

export const MEET_NOW_FORM_ID = 'meet-now-form';

export interface MeetNowFormProps {
  isOpen: boolean;
  formState: MeetNowFormState;
  titleError?: string;
  onTitleChange: (title: string) => void;
  onSelectedUsersChange: (users: User[]) => void;
  onParticipantsFilterChange: (filter: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  selfUser: User;
}

export const MeetNowForm = ({
  isOpen,
  formState,
  titleError,
  onTitleChange,
  onSelectedUsersChange,
  onParticipantsFilterChange,
  onSubmit,
  selfUser,
}: MeetNowFormProps) => {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const {mainViewModel, translate} = useApplicationContext();
  const {users} = useMeetingParticipants();
  const portalContainer = getOverlayPortalContainer();

  const contentViewModel = mainViewModel.content;
  const conversationRepository = contentViewModel.repositories.conversation;
  const searchRepository = contentViewModel.repositories.search;
  const teamRepository = contentViewModel.repositories.team;

  useEffect(() => {
    if (isOpen) {
      titleInputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <form id={MEET_NOW_FORM_ID} css={meetNowFormLayoutStyles} onSubmit={onSubmit} noValidate>
      <Input
        id="meet-now-title"
        data-uie-name="meet-now-title"
        ref={titleInputRef}
        autoComplete="off"
        label={translate('meetings.scheduleModal.titleLabel')}
        placeholder={translate('meetings.scheduleModal.titlePlaceholder')}
        value={formState.title}
        onChange={event => onTitleChange(event.currentTarget.value)}
        markInvalid={isNonEmptyString(titleError)}
        error={isNonEmptyString(titleError) ? <ErrorMessage>{titleError}</ErrorMessage> : undefined}
        inputCSS={scheduleMeetingTitleInputStyles}
        wrapperCSS={scheduleMeetingTitleInputWrapperStyles}
        endContent={
          formState.title.length > 0 && !isNonEmptyString(titleError) ? (
            <button
              type="button"
              onClick={() => onTitleChange('')}
              css={scheduleMeetingTitleClearButtonStyles}
              aria-label={translate('accessibility.userProfileDeleteEntry')}
            >
              <CircleCloseIcon />
            </button>
          ) : undefined
        }
      />

      <div css={scheduleMeetingParticipantsSectionCss}>
        <MeetingParticipantsPicker
          id="meet-now-participants"
          dataUieName="meet-now-participants"
          users={users}
          selectedUsers={formState.selectedUsers}
          onSelectedUsersChange={onSelectedUsersChange}
          filter={formState.participantsFilter}
          onFilterChange={onParticipantsFilterChange}
          selfUser={selfUser}
          searchRepository={searchRepository}
          teamRepository={teamRepository}
          conversationRepository={conversationRepository}
          label={translate('meetings.scheduleModal.participantsLabel')}
          placeholder={translate('meetings.scheduleModal.participantsPlaceholder')}
          popoverPortalContainer={portalContainer}
        />
      </div>
    </form>
  );
};
