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

import {useMemo, type FunctionComponent} from 'react';

import {isUndefined} from '@sindresorhus/is';
import {container} from 'tsyringe';

import {ScheduleMeetingForm} from './scheduleMeetingForm';
import {scheduleMeetingModes, wasScheduleMeetingPersisted} from './scheduleMeetingTypes';
import {hasScheduleMeetingFormErrors, useScheduleMeetingModal} from './useScheduleMeetingModal';
import {useScheduleMeetingSubmit} from './useScheduleMeetingSubmit';

import {useApplicationContext} from '../../../page/rootProvider';
import {UserState} from '../../../repositories/user/userState';
import {CalendarIcon} from '../../../uiKit/dataDisplay/icon/calendarIcon';
import {CloseIcon} from '../../../uiKit/dataDisplay/icon/closeIcon';
import {Button, ButtonVariant} from '../../../uiKit/inputs/button/button';
import {handleEscDown} from '../../../util/keyboardUtil';
import {ModalComponent} from '../../Modals/ModalComponent';
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
} from '../shared/styles/meetingModalShell.styles';

export const ScheduleMeetingModal: FunctionComponent = () => {
  const {fireAndForgetInvoker, translate, clock} = useApplicationContext();
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
    setPassword,
    setPasswordConfirmation,
    validate,
  } = useScheduleMeetingModal();

  const {isSubmitting, submit} = useScheduleMeetingSubmit();
  const selfUser = container.resolve(UserState).self();

  const displayErrors = useMemo(() => {
    return {
      title: isUndefined(errors.title) ? undefined : translate(errors.title),
      missingTimes: isUndefined(errors.missingTimes) ? undefined : translate(errors.missingTimes),
      startInPast: isUndefined(errors.startInPast) ? undefined : translate(errors.startInPast),
      endInPast: isUndefined(errors.endInPast) ? undefined : translate(errors.endInPast),
      endBeforeStart: isUndefined(errors.endBeforeStart) ? undefined : translate(errors.endBeforeStart),
      password: isUndefined(errors.password) ? undefined : translate(errors.password),
      passwordConfirmation: isUndefined(errors.passwordConfirmation)
        ? undefined
        : translate(errors.passwordConfirmation),
    };
  }, [errors, translate]);

  const handleClose = (): void => {
    if (isSubmitting) {
      return;
    }

    close();
    reset(clock);
  };

  const handleSubmit = (): void => {
    const validationErrors = validate(clock);
    if (hasScheduleMeetingFormErrors(validationErrors)) {
      return;
    }

    fireAndForgetInvoker.fireAndForget(async (): Promise<void> => {
      const submitResult = await submit(formState);
      if (wasScheduleMeetingPersisted(submitResult)) {
        handleClose();
      }
    });
  };

  const modalTitle =
    mode === scheduleMeetingModes.edit
      ? translate('meetings.scheduleModal.editTitle')
      : translate('meetings.scheduleModal.scheduleTitle');

  const submitLabel =
    mode === scheduleMeetingModes.edit
      ? translate('meetings.scheduleModal.confirmChanges')
      : translate('meetings.action.scheduleMeeting');

  return (
    <ModalComponent
      id="schedule-meeting-modal"
      wrapperCSS={modalWrapperStyles}
      isShown={isOpen}
      onClosed={handleClose}
      data-uie-name="schedule-meeting-modal"
      onKeyDown={event => {
        return handleEscDown(event, handleClose);
      }}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <button
            type="button"
            css={closeButtonStyles}
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label={translate('meetings.scheduleModal.closeAriaLabel')}
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
            isOpen={isOpen}
            mode={mode}
            formState={formState}
            errors={displayErrors}
            onTitleChange={setTitle}
            onStartChange={setStart}
            onEndChange={setEnd}
            onRecurrenceChange={setRecurrence}
            onSelectedUsersChange={setSelectedUsers}
            onParticipantsFilterChange={setParticipantsFilter}
            onPasswordChange={setPassword}
            onPasswordConfirmationChange={setPasswordConfirmation}
            selfUser={selfUser}
          />
        </div>

        <footer css={footerStyles}>
          <Button
            variant={ButtonVariant.PRIMARY}
            css={submitButtonStyles}
            onClick={handleSubmit}
            disabled={isSubmitting}
            showLoading={isSubmitting}
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
