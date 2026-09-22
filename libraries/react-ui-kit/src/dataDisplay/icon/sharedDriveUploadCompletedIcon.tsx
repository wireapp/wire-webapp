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

import {useTheme} from '@emotion/react';

import {SVGIcon, SVGIconProps} from './svgIcon';

import {COLOR_V2, THEME_ID, Theme} from '../../identity';

export const SharedDriveUploadCompletedIcon = ({color, ...props}: SVGIconProps) => {
  const theme = useTheme() as Theme;
  const isDarkTheme = theme?.themeId === THEME_ID.DARK;
  const resolvedColor = color ?? (isDarkTheme ? COLOR_V2.BLUE_DARK_500 : COLOR_V2.BLUE_LIGHT_500);

  return (
    <SVGIcon realWidth={16} realHeight={16} {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8ZM16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8ZM7.34126 11.2704L12.469 6.14265L11.0548 4.72844L6.63421 9.14905L4.9452 7.45978L3.53088 8.87389L5.92699 11.2704L6.6341 11.9776L7.34126 11.2704Z"
        fill={resolvedColor}
      />
    </SVGIcon>
  );
};
