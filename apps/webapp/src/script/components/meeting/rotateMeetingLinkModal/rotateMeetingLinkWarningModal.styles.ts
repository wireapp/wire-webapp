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

import {CSSObject} from '@emotion/react';

import {footerStyles, modalWrapperStyles} from 'Components/meeting/shared/styles/meetingModalShell.styles';

export const warningModalWrapperStyles: CSSObject = {
  ...modalWrapperStyles,
  maxWidth: '560px',
};

export const warningModalFooterStyles: CSSObject = {
  ...footerStyles,
  gap: '12px',
};

export const warningModalConfirmButtonStyles: CSSObject = {
  flex: '1 1 auto',
  minWidth: 0,
  whiteSpace: 'nowrap',
};

export const warningModalCancelButtonStyles: CSSObject = {
  flex: '0 0 auto',
  width: 'auto',
};
