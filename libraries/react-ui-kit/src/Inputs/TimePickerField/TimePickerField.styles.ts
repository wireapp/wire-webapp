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

import {overlayPortalZIndex} from '../../utils/overlayPortal';

export const timePickerWrapperStyles: CSSObject = {
  width: '100%',
  minWidth: 0,
};

/** Applied to the react-select container wrapper only — not the control. */
export const timeSelectContainerStyles: CSSObject = {
  minWidth: 0,
  width: '100%',
};

export const timeSelectStyles: CSSObject = {
  boxSizing: 'border-box',
  height: '48px',
  minHeight: '48px',
  maxHeight: '48px',
  width: '100%',
  minWidth: 0,
  borderRadius: '14px',
  padding: '0 14px',
};

export const timeSelectMenuStyles: CSSObject = {
  boxSizing: 'border-box',
};

export const timeSelectMenuPortalStyles: CSSObject = {
  zIndex: overlayPortalZIndex,
};

export const timeSelectLabelVisuallyHiddenStyles: CSSObject = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
};
