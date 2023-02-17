/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export const wrapperStyles: CSSObject = {
  display: 'inline-flex',
};

export const messageActionsGroup: CSSObject = {
  display: 'flex',
  marginLeft: '8px',
  padding: '2px',
};

export const messageBodyActions: CSSObject = {
  alignItems: 'center',
  height: '24px',
  position: 'absolute',
  right: 0,
  top: '-0.5rem',
  left: '28rem',
  width: 'var(--conversation-message-timestamp-width)',
  '@media (max-width: @screen-md-min)': {
    height: '45px',
    flexDirection: 'column',
  },
};

export const messageActionsMenuButton: CSSObject = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '8px 12px',
  background: '#FFFFFF',
  border: '1px solid #DCE0E3',
  cursor: 'pointer',
};

export const messageActionsMenuButtonFirst: CSSObject = {
  borderRadius: '12px 0px 0px 12px',
};

export const messageActionsMenuButtonLast: CSSObject = {
  borderRadius: '0px 12px 12px 0px',
};

export const messageWithHeaderTop: CSSObject = {
  top: '2.8rem',
};

// export const quoteMessageTop: CSSObject = {
//   top: '2.8rem',
// };

// export const quoteMessageWithoutHeaderTop: CSSObject = {
//   top: '-5rem',
// };
