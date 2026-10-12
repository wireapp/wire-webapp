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

import {type ReactNode} from 'react';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {CopyToClipboardButton} from 'Components/copyToClipboardButton';
import {meetingLinkConfirmationStyles} from 'Components/meeting/meetingLinkConfirmation/meetingLinkConfirmation.styles';
import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import type {Translate} from 'Util/localizerUtil';

type ShowMeetingLinkConfirmationParams = {
  link: string;
  translate: Translate;
  onClosed?: () => void;
};

export type MeetingLinkConfirmationSession = {
  link: string;
  onClosed: () => void;
};

type MeetingLinkConfirmationMessageProps = {
  link: string;
  translate: Translate;
};

export const MeetingLinkConfirmationMessage = ({link, translate}: MeetingLinkConfirmationMessageProps) => {
  return (
    <>
      <p>{translate('meetings.meetingLink.description')}</p>
      <div css={meetingLinkConfirmationStyles}>
        <CopyToClipboardButton
          textToCopy={link}
          displayText={translate('meetings.meetingLink.copyLink')}
          copySuccessText={translate('meetings.meetingLink.copyLinkDone')}
          variant={ButtonVariant.PRIMARY}
        />
        <Button
          type="button"
          variant={ButtonVariant.SECONDARY}
          onClick={() => {
            removeCurrentModal();
          }}
        >
          {translate('meetings.meetingLink.close')}
        </Button>
      </div>
    </>
  );
};

export const showMeetingLinkConfirmation = ({link, translate, onClosed}: ShowMeetingLinkConfirmationParams): void => {
  const message: ReactNode = <MeetingLinkConfirmationMessage link={link} translate={translate} />;

  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      close: onClosed,
      confirmCancelBtnLabel: '',
      hideSecondary: true,
      text: {
        closeBtnLabel: translate('meetings.meetingLink.close'),
        message,
        title: translate('meetings.meetingLink.title'),
      },
    },
    undefined,
    translate,
  );
};
