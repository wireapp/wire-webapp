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

import {Button, ButtonVariant, CloseIcon} from '@wireapp/react-ui-kit';

import {
  warningModalCancelButtonStyles,
  warningModalConfirmButtonStyles,
  warningModalFooterStyles,
  warningModalWrapperStyles,
} from 'Components/meeting/rotateMeetingLinkModal/rotateMeetingLinkWarningModal.styles';
import {
  bodyStyles,
  closeButtonStyles,
  headerStyles,
  headerTitleStyles,
  wrapperStyles,
} from 'Components/meeting/shared/styles/meetingModalShell.styles';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEscDown} from 'Util/keyboardUtil';

type RotateMeetingLinkWarningModalProps = {
  isShown: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export const RotateMeetingLinkWarningModal = ({isShown, onCancel, onConfirm}: RotateMeetingLinkWarningModalProps) => {
  const {translate} = useApplicationContext();

  return (
    <ModalComponent
      id="rotate-meeting-link-warning-modal"
      data-uie-name="rotate-meeting-link-warning-modal"
      wrapperCSS={warningModalWrapperStyles}
      isShown={isShown}
      onKeyDown={event => {
        return handleEscDown(event, onCancel);
      }}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <button
            type="button"
            css={closeButtonStyles}
            onClick={onCancel}
            aria-label={translate('meetings.rotateLink.close')}
          >
            <CloseIcon aria-hidden="true" />
          </button>
          <h2 css={headerTitleStyles}>{translate('meetings.rotateLink.generateLinkWithoutPasswordTitle')}</h2>
        </header>
        <div css={bodyStyles}>
          <p>{translate('meetings.rotateLink.generateLinkWithoutPasswordWarning')}</p>
        </div>
        <footer css={warningModalFooterStyles}>
          <Button
            type="button"
            variant={ButtonVariant.SECONDARY}
            css={warningModalCancelButtonStyles}
            onClick={onCancel}
          >
            {translate('meetings.rotateLink.cancel')}
          </Button>
          <Button
            type="button"
            variant={ButtonVariant.PRIMARY}
            css={warningModalConfirmButtonStyles}
            onClick={onConfirm}
          >
            {translate('meetings.rotateLink.generateLinkWithoutPasswordConfirm')}
          </Button>
        </footer>
      </div>
    </ModalComponent>
  );
};
