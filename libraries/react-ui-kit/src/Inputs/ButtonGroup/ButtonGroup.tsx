/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ButtonHTMLAttributes, forwardRef, ReactNode} from 'react';

import {CSSObject} from '@emotion/react';

import {Theme} from '../../Identity/Theme';
import {Button, ButtonProps, ButtonVariant} from '../Button';
import {buttonStyle} from '../Button/Button.styles';

const buttonGroupStyle: (theme: Theme) => CSSObject = () => ({
  display: 'flex',
  alignItems: 'center',
});

const groupedButtonStyle: <T>(theme: Theme, props: ButtonProps<T>) => CSSObject = (theme, props) => ({
  height: '32px',
  borderRadius: '12px',
  padding: '0 12px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  '&:not(:last-of-type)': {
    borderTopRightRadius: '0',
    borderBottomRightRadius: '0',
  },
  '&:not(:first-of-type)': {
    borderTopLeftRadius: '0',
    borderBottomLeftRadius: '0',
  },
  '&:first-of-type:last-of-type': {
    borderRadius: '0',
  },
  ...buttonStyle(theme, props),
});

type GroupedButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
};

interface ButtonGroupProps {
  children: ReactNode;
}
const ButtonGroup = ({children}: ButtonGroupProps) => (
  <div css={(theme: Theme) => buttonGroupStyle(theme)} role="group" aria-label="Button Group">
    {children}
  </div>
);

const GroupedButton = forwardRef<HTMLButtonElement, GroupedButtonProps>(({children, icon, ...props}, ref) => {
  return (
    <Button ref={ref} css={(theme: Theme) => groupedButtonStyle(theme, props)} {...props}>
      {icon}
      {children && (
        <span
          css={(theme: Theme) => ({
            marginLeft: !!icon && '6px',
            fontSize: theme.fontSizes.small,
            fontWeight: 'bold',
            lineHeight: '0.875rem',
            letterSpacing: '0.25px',
          })}
        >
          {children}
        </span>
      )}
    </Button>
  );
});

GroupedButton.displayName = 'Button';

ButtonGroup.Button = GroupedButton;

export {ButtonGroup};
