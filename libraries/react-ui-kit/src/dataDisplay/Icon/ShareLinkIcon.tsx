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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const ShareLinkIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} strokeWidth="2" {...props}>
    <path
      fill="none"
      strokeWidth="2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.99998 11.3333H4.66665C3.78259 11.3333 2.93475 10.9821 2.30962 10.357C1.6845 9.73186 1.33331 8.88401 1.33331 7.99996C1.33331 7.1159 1.6845 6.26806 2.30962 5.64294C2.93475 5.01782 3.78259 4.66663 4.66665 4.66663H5.99998"
    />
    <path
      fill="none"
      strokeWidth="2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 4.66663H11.3333C12.2174 4.66663 13.0652 5.01782 13.6904 5.64294C14.3155 6.26806 14.6667 7.1159 14.6667 7.99996C14.6667 8.88401 14.3155 9.73186 13.6904 10.357C13.0652 10.9821 12.2174 11.3333 11.3333 11.3333H10"
    />
    <path d="M5.5 8H10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </SVGIcon>
);
