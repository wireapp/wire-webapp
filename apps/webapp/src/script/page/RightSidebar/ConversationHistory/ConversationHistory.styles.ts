/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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
import {
  salesModalWrapperCss,
  salesModalBodyCss,
  salesModalBodyButtonCss,
} from 'Components/Modals/CreateConversation/CreateConversationSteps/ConversationDetails/ConversationDetails.styles';
import {customHistorySharingFormContainerCss} from 'Components/Modals/CreateConversation/CreateConversationSteps/CreateConversationSteps.styles';

export const teamCreationWrapperCss: CSSObject = {
  ...salesModalWrapperCss,
  marginTop: '1rem',
  width: '100%',
};

export const teamCreationBodyCss: CSSObject = {
  ...salesModalBodyCss,
  padding: '16px',
};

export const teamCreationTextCss: CSSObject = {
  margin: 0,
  marginBottom: '0.5rem',
  color: 'var(--white)',
  maxWidth: '78%',
};

export const teamCreationButtonCss: CSSObject = {
  ...salesModalBodyButtonCss,
  marginTop: 0,
};

export const conversationHistoryContainerCss: CSSObject = {
  padding: '24px 16px',
};

export const conversationHistoryParagraphCss: CSSObject = {
  margin: '16px 0',
};

export const conversationHistoryCustomCss: CSSObject = {
  ...customHistorySharingFormContainerCss,
  marginLeft: '30px',
};
