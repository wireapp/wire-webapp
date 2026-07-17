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

import {useMemo} from 'react';

import {container} from 'tsyringe';

import {Button, ButtonVariant, CallIcon, CloseIcon} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEscDown} from 'Util/keyboardUtil';

import {MeetNowForm} from './MeetNowForm';
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
} from './MeetNowModal.styles';
import {hasMeetNowFormErrors, useMeetNowModal} from './useMeetNowModal';
import {useMeetNowSubmit} from './useMeetNowSubmit';

export const MeetNowModal = () => {
  const {fireAndForgetInvoker, translate} = useApplicationContext();
  const {isOpen, formState, errors, close, reset, setTitle, setSelectedUsers, setParticipantsFilter, validate} =
    useMeetNowModal();
  const {isSubmitting, submit} = useMeetNowSubmit();
  const selfUser = container.resolve(UserState).self();

  const titleError = useMemo(() => (errors.title ? translate(errors.title) : undefined), [errors.title, translate]);

  const handleClose = () => {
    close();
    reset();
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (hasMeetNowFormErrors(validationErrors)) {
      return;
    }

    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      const didStart = await submit(formState);
      if (didStart) {
        handleClose();
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
      data-uie-name="meet-now-modal"
      onKeyDown={event => handleEscDown(event, handleClose)}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <button
            type="button"
            css={closeButtonStyles}
            onClick={handleClose}
            aria-label={translate('meetings.meetNowModal.closeAriaLabel')}
            data-uie-name="meet-now-modal-close"
          >
            <CloseIcon aria-hidden="true" />
          </button>
          <h2 css={headerTitleStyles} data-uie-name="meet-now-modal-title">
            {translate('meetings.meetNowModal.title')}
          </h2>
        </header>

        <div css={bodyStyles}>
          <MeetNowForm
            formState={formState}
            titleError={titleError}
            onTitleChange={setTitle}
            onSelectedUsersChange={setSelectedUsers}
            onParticipantsFilterChange={setParticipantsFilter}
            selfUser={selfUser}
          />
        </div>

        <footer css={footerStyles}>
          <Button
            variant={ButtonVariant.PRIMARY}
            css={submitButtonStyles}
            onClick={handleSubmit}
            disabled={isSubmitting}
            data-uie-name="meet-now-modal-submit"
          >
            <CallIcon aria-hidden="true" css={submitButtonIconStyles} />
            {translate('meetings.meetNowModal.startMeeting')}
          </Button>
        </footer>
      </div>
    </ModalComponent>
  );
};
