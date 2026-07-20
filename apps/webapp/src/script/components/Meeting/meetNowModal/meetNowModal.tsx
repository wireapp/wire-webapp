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

import {type FormEvent, useMemo, useRef} from 'react';

import {container} from 'tsyringe';

import {Button, ButtonVariant, CallIcon, CloseIcon} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEscDown} from 'Util/keyboardUtil';

import {MEET_NOW_FORM_ID, MeetNowForm} from './meetNowForm';
import {
  bodyStyles,
  closeButtonStyles,
  footerStyles,
  headerStyles,
  headerTitleStyles,
  meetNowModalWrapperStyles,
  modalWrapperStyles,
  submitButtonIconStyles,
  submitButtonStyles,
  wrapperStyles,
} from './meetNowModal.styles';
import {wasMeetNowMeetingCreated} from './meetNowTypes';
import {hasMeetNowFormErrors, useMeetNowModal} from './useMeetNowModal';
import {useMeetNowSubmit} from './useMeetNowSubmit';

export const MeetNowModal = () => {
  const {fireAndForgetInvoker, translate} = useApplicationContext();
  const {isOpen, formState, errors, close, reset, setTitle, setSelectedUsers, setParticipantsFilter, validate} =
    useMeetNowModal();
  const conversationState = container.resolve(ConversationState);
  const {isSubmitting, submit} = useMeetNowSubmit(conversationState);
  const selfUser = container.resolve(UserState).self();
  const submitGenerationRef = useRef(0);

  const titleError = useMemo(
    () => (errors.title !== undefined ? translate(errors.title) : undefined),
    [errors.title, translate],
  );

  const dismissModal = () => {
    close();
    reset();
  };

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    submitGenerationRef.current += 1;
    dismissModal();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validate();
    if (hasMeetNowFormErrors(validationErrors)) {
      return;
    }

    const submitGeneration = submitGenerationRef.current;

    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      const submitResult = await submit(formState);

      if (submitGeneration !== submitGenerationRef.current) {
        return;
      }

      if (wasMeetNowMeetingCreated(submitResult)) {
        dismissModal();
      }
    });
  };

  return (
    <ModalComponent
      id="meet-now-modal"
      wrapperCSS={{...modalWrapperStyles, ...meetNowModalWrapperStyles}}
      isShown={isOpen}
      onClosed={handleClose}
      onBgClick={handleClose}
      onKeyDown={event => handleEscDown(event, handleClose)}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <button
            type="button"
            css={closeButtonStyles}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={translate('meetings.meetNowModal.closeAriaLabel')}
          >
            <CloseIcon aria-hidden="true" />
          </button>
          <h2 css={headerTitleStyles}>{translate('meetings.meetNowModal.title')}</h2>
        </header>

        <div css={bodyStyles}>
          <MeetNowForm
            formState={formState}
            titleError={titleError}
            onTitleChange={setTitle}
            onSelectedUsersChange={setSelectedUsers}
            onParticipantsFilterChange={setParticipantsFilter}
            onSubmit={handleSubmit}
            selfUser={selfUser}
          />
        </div>

        <footer css={footerStyles}>
          <Button
            type="submit"
            form={MEET_NOW_FORM_ID}
            variant={ButtonVariant.PRIMARY}
            css={submitButtonStyles}
            disabled={isSubmitting}
          >
            <CallIcon aria-hidden="true" css={submitButtonIconStyles} />
            {translate('meetings.meetNowModal.startMeeting')}
          </Button>
        </footer>
      </div>
    </ModalComponent>
  );
};
