/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {COLOR_V2} from '../Identity';
import {FlexBox, FlexBoxProps, flexBoxStyle, filterFlexBoxProps, Theme} from '../Layout';
import {Text, linkStyle} from '../Text';
import {filterProps} from '../util';

type ErrorMessageProps<T = HTMLDivElement> = FlexBoxProps<T>;

export const errorMessageStyle: <T>(theme: Theme, props: ErrorMessageProps<T>) => CSSObject = (
  theme,
  {justify = 'flex-start', align = 'center', ...props},
) => ({
  ...flexBoxStyle({align, justify, ...props}),
  a: {
    ...linkStyle(theme, {bold: false, fontSize: '12px', textTransform: 'none', ...props}),
  },
  marginBottom: '12px',
});

export const filterErrorMessageProps = (props: ErrorMessageProps) => {
  return filterProps(filterFlexBoxProps(props) as ErrorMessageProps, []);
};

export const ErrorMessage = ({children, ...props}: ErrorMessageProps) => (
  <FlexBox css={(theme: Theme) => errorMessageStyle(theme, props)} {...props}>
    <Text color={COLOR_V2.RED_LIGHT_500} fontSize={'12px'} css={{fontWeight: 400}}>
      {children}
    </Text>
  </FlexBox>
);
