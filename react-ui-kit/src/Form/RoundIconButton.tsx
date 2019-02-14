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

import * as React from 'react';
import styled from 'styled-components';
import {
  ArrowIcon,
  AttachmentIcon,
  CheckIcon,
  CloseIcon,
  GifIcon,
  ImageIcon,
  PingIcon,
  PlaneIcon,
  ProfileIcon,
  RoundContainer,
  TeamIcon,
  TimedIcon,
  TrashIcon,
} from '../Icon';
import {COLOR} from '../Identity';
import {defaultTransition} from '../Identity/motions';

export interface RoundIconButtonProps extends ButtonProps {
  icon?: ICON_NAME;
  iconColor?: string;
  iconHeight?: number;
  iconWidth?: number;
}

export interface ButtonProps {
  color?: string;
  size?: number;
}

const darkenAmount = 0.08;

const Button = styled(RoundContainer.withComponent(styled.button<React.ButtonHTMLAttributes<HTMLButtonElement>>``))<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
>`
  background-color: ${props => (props.disabled ? COLOR.DISABLED : props.color)};
  min-width: ${props => props.size}px;
  outline: none;
  padding: 0;
  cursor: ${props => (props.disabled ? 'default' : 'pointer')};
  ${defaultTransition} &:hover,
  &:focus {
    background-color: ${props => (props.disabled ? COLOR.DISABLED : COLOR.shade(props.color, darkenAmount))};
  }
`;

enum ICON_NAME {
  ARROW = 'arrow',
  ATTACHMENT = 'attachment',
  CHECK = 'check',
  CLOSE = 'close',
  GIF = 'gif',
  IMAGE = 'image',
  PING = 'ping',
  PLANE = 'plane',
  PROFILE = 'profile',
  TEAM = 'team',
  TIMED = 'timed',
  TRASH = 'trash',
}

const RoundIconButton: React.SFC<RoundIconButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  icon,
  iconColor,
  iconHeight,
  iconWidth,
  children,
  ...props
}) => (
  <Button {...props}>
    {(() => {
      switch (icon) {
        case ICON_NAME.ATTACHMENT: {
          return <AttachmentIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.CHECK: {
          return <CheckIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.CLOSE: {
          return <CloseIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.GIF: {
          return <GifIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.IMAGE: {
          return <ImageIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.PING: {
          return <PingIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.PLANE: {
          return <PlaneIcon color={iconColor} height={iconHeight} width={iconWidth} style={{marginLeft: 2}} />;
        }
        case ICON_NAME.PROFILE: {
          const defaultSize = 24;
          return <ProfileIcon color={iconColor} height={iconHeight || defaultSize} width={iconWidth || defaultSize} />;
        }
        case ICON_NAME.TEAM: {
          const defaultSize = 24;
          return <TeamIcon color={iconColor} height={iconHeight || defaultSize} width={iconWidth || defaultSize} />;
        }
        case ICON_NAME.TIMED: {
          return <TimedIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.TRASH: {
          return <TrashIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.ARROW: {
          return <ArrowIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        default: {
          return null;
        }
      }
    })()}
    {children}
  </Button>
);

RoundIconButton.defaultProps = {
  color: COLOR.BLUE,
  iconColor: COLOR.WHITE,
  size: 32,
};

export {RoundIconButton, ICON_NAME};
