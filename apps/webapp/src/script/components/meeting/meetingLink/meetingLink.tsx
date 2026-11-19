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

import {JSX} from 'react';

import type {CSSObject} from '@emotion/react';
import {isUndefined} from '@sindresorhus/is';

import {meetingLinkInputStyles, meetingLinkStatusStyles} from './meetingLink.styles';

import {Button, ButtonVariant, ShieldIcon} from '../../../uiKit';
import type {Translate} from '../../../util/localizerUtil/translationTypes';
import {CopyToClipboardButton} from '../../copyToClipboardButton';

type MeetingLinkProps = {
  link: string;
  hasPassword: boolean;
  translate: Translate;
  footerStyles: CSSObject;
  descriptionId?: string;
  showCancel?: boolean;
  onClose?: () => void;
};

export type ShowMeetingLinkConfirmationParams = {
  link: string;
  hasPassword: boolean;
  translate: Translate;
  onClosed?: () => void;
};

export type MeetingLinkConfirmationSession = {
  link: string;
  hasPassword: boolean;
  onClosed: () => void;
};

export const MeetingLink = ({
  link,
  hasPassword,
  translate,
  footerStyles,
  descriptionId = 'meeting-link-description',
  showCancel = false,
  onClose,
}: MeetingLinkProps): JSX.Element => {
  return (
    <>
      <p id={descriptionId} className="meeting-link-confirmation">
        {translate('meetings.meetingLink.description')}
      </p>
      <div
        role="textbox"
        aria-label={translate('meetings.meetingLink.title')}
        aria-describedby={descriptionId}
        aria-readonly="true"
        tabIndex={0}
        css={meetingLinkInputStyles}
      >
        {link}
      </div>
      <p css={meetingLinkStatusStyles} role="note">
        {hasPassword ? (
          <>
            <ShieldIcon aria-hidden="true" /> {translate('meetings.meetingLink.passwordProtected')}
          </>
        ) : (
          translate('meetings.meetingLink.passwordUnprotected')
        )}
      </p>
      <footer css={footerStyles}>
        <CopyToClipboardButton
          textToCopy={link}
          displayText={translate('meetings.meetingLink.copyLink')}
          copySuccessText={translate('meetings.meetingLink.copyLinkDone')}
          variant={ButtonVariant.PRIMARY}
        />
        {showCancel && (
          <Button type="button" variant={ButtonVariant.SECONDARY} onClick={onClose}>
            {translate('meetings.meetingLink.cancel')}
          </Button>
        )}
      </footer>
    </>
  );
};

let showMeetingLinkConfirmationHandler: ((params: ShowMeetingLinkConfirmationParams) => void) | undefined;

export const registerMeetingLinkConfirmationHandler = (
  handler: (params: ShowMeetingLinkConfirmationParams) => void,
): void => {
  showMeetingLinkConfirmationHandler = handler;
};

export const showMeetingLinkConfirmation = (params: ShowMeetingLinkConfirmationParams): void => {
  if (isUndefined(showMeetingLinkConfirmationHandler)) {
    throw new Error('Meeting link confirmation has not been initialized');
  }
  showMeetingLinkConfirmationHandler(params);
};
