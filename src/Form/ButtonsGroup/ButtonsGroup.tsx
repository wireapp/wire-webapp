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

import {ReactNode} from 'react';

import {wrapperStyles} from './ButtonsGroup.styles';

import {IconButton as IconButtonComponent, IconButtonProps, IconButtonVariant} from '../../Misc/IconButton';
import {Button as ButtonComponent, ButtonProps, ButtonVariant} from '../Button';

interface ButtonsGroupProps {
  children: ReactNode;
}

export const ButtonsGroup = ({children}: ButtonsGroupProps) => {
  return <div css={wrapperStyles}>{children}</div>;
};

const Button = (props: Omit<ButtonProps, 'variant' | 'group'>) => {
  return <ButtonComponent variant={ButtonVariant.TERTIARY} group {...props} />;
};

const IconButton = (props: Omit<IconButtonProps, 'variant' | 'group'>) => {
  return <IconButtonComponent variant={IconButtonVariant.PRIMARY} group {...props} />;
};

ButtonsGroup.Button = Button;
ButtonsGroup.IconButton = IconButton;
