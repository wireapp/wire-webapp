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

import {CSSObject, keyframes} from '@emotion/react';

import {ellipsis} from '../../utils/util';

const slideUpAndFade = keyframes`
	from {
		opacity: 0;
		transform: translateY(2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
`;
const slideRightAndFade = keyframes`
	from {
		opacity: 0;
		transform: translateX(-2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}`;

const slideDownAndFade = keyframes`
	from {
		opacity: 0;
		transform: translateY(-2px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
`;

const slideLeftAndFade = keyframes`
	from {
		opacity: 0;
		transform: translateX(2px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}
`;

export const contentStyle: CSSObject = {
  minWidth: '160px',
  zIndex: 'var(--z-index-modal)',
  padding: '8px 0',
  borderRadius: '12px',
  backgroundColor: 'var(--dropdown-menu-bg)',
  boxShadow: '0 0 1px 0 rgba(0, 0, 0, 0.08), 0 8px 24px 0 rgba(0, 0, 0, 0.16)',
  animationDuration: '400ms',
  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
  willChange: 'transform, opacity',
  outline: 'auto',

  '&[data-side="top"]': {
    animationName: slideDownAndFade,
  },
  '&[data-side="right"]': {
    animationName: slideLeftAndFade,
  },

  '&[data-side="bottom"]': {
    animationName: slideUpAndFade,
  },

  '&[data-side="left"]': {
    animationName: slideRightAndFade,
  },
};

export const itemStyle: CSSObject = {
  height: '30px',
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: '2rem',
  padding: '0 24px',
  position: 'relative',
  userSelect: 'none',
  outline: 'none',
  cursor: 'pointer',
  display: 'flex',
  overflow: 'hidden',
  maxWidth: '300px',
  alignItems: 'center',

  '&[data-highlighted]': {
    backgroundColor: 'var(--foreground-fade-16)',
  },
};

export const textStyles: CSSObject = {
  ...ellipsis(),
  display: 'inline-block',
  flexGrow: 1,
};

export const triggerStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0',
  margin: '0',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
};
