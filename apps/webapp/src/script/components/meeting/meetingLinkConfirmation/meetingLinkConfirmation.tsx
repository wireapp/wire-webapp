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

import {useState, type ReactNode} from 'react';

import {toast} from 'sonner';
import type {Task} from 'true-myth';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {CopyToClipboardButton} from 'Components/copyToClipboardButton';
import {
  meetingLinkActionsButtonsStyles,
  meetingLinkConfirmationStyles,
} from 'Components/meeting/meetingLinkConfirmation/meetingLinkConfirmation.styles';
import type {MeetingLink} from 'Components/meeting/shared/service/meetingService';
import {PrimaryModal, removeCurrentModal} from 'Components/Modals/PrimaryModal';
import type {Translate, TranslationKey} from 'Util/localizerUtil';

type ShowMeetingLinkConfirmationParams = {
  meetingLink?: MeetingLink;
  retryMeetingLink?: () => Task<MeetingLink, unknown>;
  meetingLinkUnavailable?: boolean;
  meetingLinkUnavailableForHost?: boolean;
  translate: Translate;
};

type MeetingLinkConfirmationMessageProps = Pick<
  ShowMeetingLinkConfirmationParams,
  'meetingLinkUnavailable' | 'meetingLinkUnavailableForHost' | 'retryMeetingLink' | 'translate'
> & {
  meetingLink?: MeetingLink;
};

export const MeetingLinkConfirmationMessage = ({
  meetingLink: initialMeetingLink,
  meetingLinkUnavailable,
  meetingLinkUnavailableForHost,
  retryMeetingLink,
  translate,
}: MeetingLinkConfirmationMessageProps) => {
  const [meetingLink, setMeetingLink] = useState(initialMeetingLink);
  const [isLinkUnavailable, setIsLinkUnavailable] = useState(meetingLinkUnavailable);
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = async (): Promise<void> => {
    if (retryMeetingLink === undefined || isRetrying) {
      return;
    }

    setIsRetrying(true);
    const result = await retryMeetingLink().toPromise();
    result.match({
      Ok: nextMeetingLink => {
        setMeetingLink(nextMeetingLink);
        setIsLinkUnavailable(false);
      },
      Err: () => {
        toast.error(translate('meetings.meetingLink.loadFailed'));
      },
    });
    setIsRetrying(false);
  };

  let action: ReactNode = null;
  if (meetingLink) {
    action = (
      <CopyToClipboardButton
        textToCopy={meetingLink.meetingLink}
        displayText={translate('meetings.meetingLink.copyLink')}
        copySuccessText={translate('meetings.meetingLink.copyLinkDone')}
        variant={ButtonVariant.PRIMARY}
        onCopySuccess={() => toast.success(translate('meetings.meetingLink.copyLinkDone'))}
        onCopyError={() => toast.error(translate('meetings.meetingLink.copyLinkFailed'))}
      />
    );
  } else if (retryMeetingLink) {
    action = (
      <Button
        css={meetingLinkActionsButtonsStyles}
        type="button"
        variant={ButtonVariant.PRIMARY}
        disabled={isRetrying}
        onClick={retry}
      >
        {translate('meetings.meetingLink.retry')}
      </Button>
    );
  }

  let descriptionKey: TranslationKey = 'meetings.meetingLink.description';
  if (isLinkUnavailable) {
    descriptionKey = meetingLinkUnavailableForHost
      ? 'meetings.meetingLink.unavailableForHost'
      : 'meetings.meetingLink.unavailable';
  }

  return (
    <>
      <p>{translate(descriptionKey)}</p>
      <div css={meetingLinkConfirmationStyles}>
        {action}
        <Button
          css={meetingLinkActionsButtonsStyles}
          type="button"
          variant={ButtonVariant.SECONDARY}
          onClick={removeCurrentModal}
        >
          {translate('meetings.meetingLink.close')}
        </Button>
      </div>
    </>
  );
};

export const showMeetingLinkConfirmation = ({
  meetingLink,
  meetingLinkUnavailable,
  meetingLinkUnavailableForHost,
  retryMeetingLink,
  translate,
}: ShowMeetingLinkConfirmationParams): void => {
  const message: ReactNode = (
    <MeetingLinkConfirmationMessage
      meetingLink={meetingLink}
      meetingLinkUnavailable={meetingLinkUnavailable}
      meetingLinkUnavailableForHost={meetingLinkUnavailableForHost}
      retryMeetingLink={retryMeetingLink}
      translate={translate}
    />
  );

  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
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
