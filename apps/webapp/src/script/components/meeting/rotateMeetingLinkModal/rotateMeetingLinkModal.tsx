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

import {type FormEvent, useCallback, useRef} from 'react';

import {isEmptyString, isUndefined} from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {Button, ButtonVariant, CloseIcon, ErrorMessage} from '@wireapp/react-ui-kit';

import {showMeetingLinkConfirmation} from 'Components/meeting/meetingLinkConfirmation/meetingLinkConfirmation';
import {rotateMeetingLinkDescription} from 'Components/meeting/rotateMeetingLinkModal/rotateMeetingLinkModal.styles';
import {RotateMeetingLinkWarningModal} from 'Components/meeting/rotateMeetingLinkModal/rotateMeetingLinkWarningModal';
import {MeetingLinkForm} from 'Components/meeting/shared/meetingLinkForm/meetingLinkForm';
import {
  bodyStyles,
  closeButtonStyles,
  footerStyles,
  headerStyles,
  headerTitleStyles,
  modalWrapperStyles,
  narrowModalWrapperStyles,
  submitButtonStyles,
  wrapperStyles,
} from 'Components/meeting/shared/styles/meetingModalShell.styles';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEscDown} from 'Util/keyboardUtil';
import {getLogger} from 'Util/logger';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {hasRotateMeetingLinkFormErrors, useRotateMeetingLinkModal} from './useRotateMeetingLinkModal';

import {useMeetingStore} from '../meetingStore/meetingStoreProvider';
import {rotateMeetingLinkErrors} from '../meetingStore/rotateMeetingLinkErrors';

const logger = getLogger('RotateMeetingLinkModal');

export const RotateMeetingLinkModal = () => {
  const {translate, fireAndForgetInvoker} = useApplicationContext();
  const rotateMeetingLink = useMeetingStore(state => {
    return state.rotateMeetingLink;
  });
  const state = useRotateMeetingLinkModal();
  const existingMeeting = useMeetingStore(currentState => {
    return currentState.meetingSeries.find(meeting => {
      return !isUndefined(state.meetingId) && matchQualifiedIds(meeting.qualified_id, state.meetingId);
    });
  });
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const submissionInProgressRef = useRef(false);

  const handleClose = () => {
    if (state.isSubmitting || submissionInProgressRef.current) {
      return;
    }
    state.close();
    state.reset();
  };

  const rotate = useCallback(
    (meetingId: QualifiedId, password?: string) => {
      submissionInProgressRef.current = true;
      state.startSubmitting();
      fireAndForgetInvoker.fireAndForget(async () => {
        const result = await rotateMeetingLink(meetingId, password);
        result.match({
          Ok: meeting => {
            const link = meeting.link;
            submissionInProgressRef.current = false;
            state.close();
            state.reset();
            if (!isUndefined(link)) {
              showMeetingLinkConfirmation({link, hasPassword: meeting.has_password, translate});
            }
          },
          Err: error => {
            logger.warn('Failed to rotate meeting link', {error, meetingId});
            submissionInProgressRef.current = false;
            state.setFailure(
              error === rotateMeetingLinkErrors.notFound
                ? translate('meetings.rotateLink.notFoundError')
                : translate('meetings.rotateLink.requestError'),
            );
          },
        });
      });
    },
    [fireAndForgetInvoker, rotateMeetingLink, state, translate],
  );

  const handleWarningConfirm = () => {
    const meetingId = state.confirmWarning();
    if (!isUndefined(meetingId)) {
      rotate(meetingId);
    }
  };

  const handleRotate = () => {
    const errors = state.errors;
    const meetingId = state.meetingId;
    // State controls the rendered UI; the ref closes the same-tick/stale-closure double-submit race before React re-renders.
    if (
      hasRotateMeetingLinkFormErrors(errors) ||
      isUndefined(meetingId) ||
      state.isSubmitting ||
      submissionInProgressRef.current
    ) {
      return;
    }

    const trimmedPassword = state.password.trim();
    const password = isEmptyString(trimmedPassword) ? undefined : trimmedPassword;

    if ((existingMeeting?.has_password === true || isUndefined(existingMeeting)) && isUndefined(password)) {
      state.showWarning(meetingId);
      return;
    }

    rotate(meetingId, password);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleRotate();
  };

  return (
    <ModalComponent
      id="rotate-meeting-link-modal"
      data-uie-name="rotate-meeting-link-modal"
      wrapperCSS={{...modalWrapperStyles, ...narrowModalWrapperStyles}}
      isShown={state.isOpen}
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
            disabled={state.isSubmitting}
            aria-label={translate('meetings.rotateLink.close')}
          >
            <CloseIcon aria-hidden="true" />
          </button>
          <h2 css={headerTitleStyles}>{translate('meetings.rotateLink.title')}</h2>
        </header>
        <div css={bodyStyles}>
          <form id="rotate-meeting-link-form" onSubmit={handleSubmit} noValidate>
            <p css={rotateMeetingLinkDescription}>{translate('meetings.rotateLink.description')}</p>
            <MeetingLinkForm
              translate={translate}
              onGeneratePassword={password => {
                state.setPassword(password);
                state.setPasswordConfirmation(password);
              }}
              passwordValue={state.password}
              passwordValueRef={passwordInputRef}
              passwordError={!isUndefined(state.errors.password) ? translate(state.errors.password) : undefined}
              passwordConfirmationError={
                !isUndefined(state.errors.passwordConfirmation)
                  ? translate(state.errors.passwordConfirmation)
                  : undefined
              }
              onPasswordValueChange={state.setPassword}
              isPasswordInputMarkInvalid={!isUndefined(state.errors.password)}
              passwordConfirmationValue={state.passwordConfirmation}
              onPasswordConfirmationChange={state.setPasswordConfirmation}
              isPasswordConfirmationMarkInvalid={!isUndefined(state.errors.passwordConfirmation)}
              copyDisabled={isEmptyString(state.password) || !isUndefined(state.errors.password)}
            />
            {!isUndefined(state.error) ? <ErrorMessage>{state.error}</ErrorMessage> : null}
          </form>
        </div>
        <footer css={footerStyles}>
          <Button
            type="submit"
            form="rotate-meeting-link-form"
            variant={ButtonVariant.PRIMARY}
            css={submitButtonStyles}
            disabled={state.isSubmitting}
            showLoading={state.isSubmitting}
          >
            {state.isSubmitting ? translate('meetings.rotateLink.generating') : translate('meetings.rotateLink.submit')}
          </Button>
        </footer>
      </div>
      <RotateMeetingLinkWarningModal
        isShown={state.isWarningShown}
        onCancel={state.cancelWarning}
        onConfirm={handleWarningConfirm}
      />
    </ModalComponent>
  );
};
