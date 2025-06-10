/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

export const HelpIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={16} {...props}>
    <path d="M5.003 6.162C4.92 4.268 6.45 3.5 8.037 3.5 9.643 3.5 11 4.294 11 5.913c0 1.139-.666 1.632-1.286 2.048-.756.505-1.05.704-1.05 1.389v.307H6.853l-.013-.288c-.096-.992.314-1.645 1.094-2.138.596-.39.992-.653.992-1.216 0-.646-.492-.928-1.01-.928-.673 0-1.031.467-1.044 1.075H5.003Zm1.664 5.35c0-.614.5-1.01 1.114-1.01.614 0 1.12.396 1.12 1.01 0 .615-.506 1.012-1.12 1.012-.615 0-1.114-.397-1.114-1.011Z" />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm0-2A6 6 0 1 0 8 2a6 6 0 0 0 0 12Z"
    />
  </SVGIcon>
);
