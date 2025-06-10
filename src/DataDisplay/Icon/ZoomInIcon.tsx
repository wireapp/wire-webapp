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

export const ZoomInIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.98711 0C10.846 0 13.9742 3.13096 13.9742 6.9932C13.9742 8.564 13.4568 10.0138 12.5832 11.1813L16 14.5872L14.5884 16L11.1716 12.5941C10.0051 13.4685 8.55655 13.9864 6.98711 13.9864C3.12824 13.9864 0 10.8554 0 6.9932C0 3.13096 3.12824 0 6.98711 0ZM12 7C12 9.76142 9.76142 12 7 12C4.23858 12 2 9.76142 2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7Z"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M6.07202 7.98102V10H8.07202V7.98102H10V5.98102H8.07202V4H6.07202V5.98102H4V7.98102H6.07202Z"
    />
  </SVGIcon>
);
