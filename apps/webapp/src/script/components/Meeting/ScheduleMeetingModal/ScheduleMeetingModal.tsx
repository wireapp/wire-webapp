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

import {Button, ButtonVariant, CalendarIcon, CloseIcon} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {UserState} from 'Repositories/user/userState';
import {handleEscDown} from 'Util/keyboardUtil';
import {t} from 'Util/localizerUtil';

import {ScheduleMeetingForm} from './ScheduleMeetingForm';
import {
  bodyStyles,
  closeButtonStyles,
  footerStyles,
  headerStyles,
  headerTitleStyles,
  modalWrapperStyles,
  submitButtonIconStyles,
  submitButtonStyles,
  wrapperStyles,
} from './ScheduleMeetingModal.styles';
import {hasScheduleMeetingFormErrors, useScheduleMeetingModal} from './useScheduleMeetingModal';

export const ScheduleMeetingModal = () => {
  const {
    isOpen,
    mode,
    formState,
    errors,
    close,
    reset,
    setTitle,
    setStart,
    setEnd,
    setRecurrence,
    setSelectedUsers,
    setParticipantsFilter,
    validate,
  } = useScheduleMeetingModal();

  const selfUser = container.resolve(UserState).self();

  const displayErrors = useMemo(
    () => ({
      title: errors.title ? t(errors.title) : undefined,
      endBeforeStart: errors.endBeforeStart ? t(errors.endBeforeStart) : undefined,
    }),
    [errors],
  );

  const handleClose = () => {
    close();
    reset();
  };

  const handleSubmit = () => {
    const validationErrors = validate();
    if (hasScheduleMeetingFormErrors(validationErrors)) {
      return;
    }

    // TODO: submit scheduled meeting via API
    handleClose();
  };

  const modalTitle =
    mode === 'edit' ? t('meetings.scheduleModal.editTitle') : t('meetings.scheduleModal.scheduleTitle');

  const submitLabel =
    mode === 'edit' ? t('meetings.scheduleModal.confirmChanges') : t('meetings.action.scheduleMeeting');

  return (
    <ModalComponent
      id="schedule-meeting-modal"
      wrapperCSS={modalWrapperStyles}
      isShown={isOpen}
      onClosed={handleClose}
      onBgClick={handleClose}
      data-uie-name="schedule-meeting-modal"
      onKeyDown={event => handleEscDown(event, handleClose)}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <button
            type="button"
            css={closeButtonStyles}
            onClick={handleClose}
            aria-label={t('meetings.scheduleModal.closeAriaLabel')}
            data-uie-name="schedule-meeting-modal-close"
          >
            <CloseIcon aria-hidden="true" />
          </button>
          <h2 css={headerTitleStyles} data-uie-name="schedule-meeting-modal-title">
            {modalTitle}
          </h2>
        </header>

        <div css={bodyStyles}>
          <ScheduleMeetingForm
            mode={mode}
            formState={formState}
            errors={displayErrors}
            onTitleChange={setTitle}
            onStartChange={setStart}
            onEndChange={setEnd}
            onRecurrenceChange={setRecurrence}
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
            data-uie-name="schedule-meeting-modal-submit"
          >
            <CalendarIcon aria-hidden="true" css={submitButtonIconStyles} />
            {submitLabel}
          </Button>
        </footer>
      </div>
    </ModalComponent>
  );
};
