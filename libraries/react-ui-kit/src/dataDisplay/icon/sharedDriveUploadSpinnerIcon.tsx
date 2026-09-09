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

interface SharedDriveUploadSpinnerIconProps extends SVGIconProps {
  colorDark?: string;
  trackColor?: string;
  trackColorDark?: string;
}

export const SharedDriveUploadSpinnerIcon = ({
  color,
  colorDark,
  trackColor,
  trackColorDark,
  ...props
}: SharedDriveUploadSpinnerIconProps) => {
  const theme = useTheme() as Theme;
  const isDarkTheme = theme?.themeId === THEME_ID.DARK;
  const resolvedColor =
    (isDarkTheme ? (colorDark ?? color) : color) ?? (isDarkTheme ? COLOR_V2.BLUE_DARK_500 : COLOR_V2.BLUE_LIGHT_500);
  const resolvedTrackColor =
    (isDarkTheme ? (trackColorDark ?? trackColor) : trackColor) ??
    (isDarkTheme ? COLOR_V2.BLUE_DARK_900 : COLOR_V2.BLUE_LIGHT_50);

  return (
    <SVGIcon realWidth={16} realHeight={16} {...props}>
      <circle cx="8" cy="8" r="7" fill="none" stroke={resolvedTrackColor} strokeWidth="2" />
      <path
        d="M8.1556 0.00171717L8.10956 2.00119C11.4224 2.07747 14.0461 4.82489 13.9698 8.13772C13.8936 11.4505 11.1461 14.0743 7.83332 13.998C6.76788 13.9735 5.77371 13.6727 4.91772 13.1656L3.42979 14.5865C4.67045 15.4437 6.16705 15.9602 7.78728 15.9975C12.2044 16.0992 15.8676 12.6009 15.9693 8.18376C16.071 3.76665 12.5727 0.103428 8.1556 0.00171717Z"
        fill={resolvedColor}
      />
    </SVGIcon>
  );
};
