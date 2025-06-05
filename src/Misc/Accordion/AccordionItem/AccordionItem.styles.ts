/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {CSSObject, keyframes} from '@emotion/react';

import {COLOR_V2} from '../../../Identity/colors-v2';
import {ellipsis} from '../../../util';

const ANIMATION_TIMING = '300ms';
const ANIMATION_EASING = 'cubic-bezier(0.87, 0, 0.13, 1)';

const slideDown = keyframes`
  from {
    height: 0;
  }
  to {
    height: var(--radix-accordion-content-height);
  }
`;

const slideUp = keyframes`
  from {
    height: var(--radix-accordion-content-height);
  }
  to {
    height: 0;
  }
`;

export const wrapperStyles: CSSObject = {
  width: '100%',
  overflow: 'hidden',
};

export const itemStyles: CSSObject = {
  overflow: 'hidden',
  borderBottom: `1px solid var(--text-input-border)`,
  '&:not(:last-child)': {
    marginBottom: '8px',
  },
};

export const triggerStyles: CSSObject = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  background: 'none',
  padding: '0',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  height: '40px',
};

export const triggerTextStyles: CSSObject = {
  ...ellipsis(),
  fontSize: '16px',
  marginRight: '16px',
};

export const contentStyles: CSSObject = {
  overflow: 'hidden',
  '&[data-state="open"]': {
    animation: `${slideDown} ${ANIMATION_TIMING} ${ANIMATION_EASING}`,
  },
  '&[data-state="closed"]': {
    animation: `${slideUp} ${ANIMATION_TIMING} ${ANIMATION_EASING}`,
  },
};

export const contentTextStyles: CSSObject = {
  width: '100%',
  padding: '16px 0',
};

export const chevronStyles: CSSObject = {
  width: '16px',
  height: '16px',
  color: COLOR_V2.GRAY_70,
  transition: `transform ${ANIMATION_TIMING} ${ANIMATION_EASING}`,
  '[data-state="open"] &': {
    transform: 'rotate(180deg)',
  },
};
