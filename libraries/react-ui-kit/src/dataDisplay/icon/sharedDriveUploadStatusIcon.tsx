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

import type {CSSObject} from '@emotion/react';

import type {SVGIconProps} from './svgIcon';

const spinnerStyles: CSSObject = {
  transformBox: 'view-box',
  transformOrigin: '12px 12px',
  animation: 'shared-drive-upload-status-spinner 1s linear infinite',
  '@keyframes shared-drive-upload-status-spinner': {
    from: {transform: 'rotate(0deg)'},
    to: {transform: 'rotate(360deg)'},
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
};

export const SharedDriveUploadStatusIcon = (props: SVGIconProps) => (
  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" {...props}>
    <circle cx="12" cy="12" r="11.25" fill="none" stroke="var(--accent-color-highlight, #e7f0fa)" strokeWidth="1.5" />
    <g css={spinnerStyles}>
      <path
        d="M12.2792 0.88967C18.4591 1.03197 23.3536 6.15716 23.2113 12.3371C23.069 18.517 17.9438 23.4115 11.7639 23.2692C9.49701 23.217 7.40313 22.4944 5.66734 21.2952"
        stroke="var(--accent-color, #0667c8)"
        strokeWidth="1.5"
      />
    </g>
    <path
      d="M11.3418 9.91852L7.90336 13.3569L6.97528 12.4289L12.0001 7.40405L17.0249 12.4289L16.0968 13.3569L12.6543 9.91439L12.6543 16.5916L11.3418 16.5916L11.3418 9.91852Z"
      fill="var(--accent-color, #0667c8)"
    />
  </svg>
);
