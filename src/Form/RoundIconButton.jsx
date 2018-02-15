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

import {ArrowIcon, CheckIcon, CloseIcon, PlaneIcon, ProfileIcon, RoundContainer, TeamIcon} from '../Icon';
import {COLOR} from '../Identity';
import PropTypes from 'prop-types';
import React from 'react';
import {defaultTransition} from '../Identity/motions';

const darkenAmount = 0.08;

const Button = RoundContainer.withComponent('button').extend`
  background-color: ${props => (props.disabled ? COLOR.DISABLED : props.color)};
  min-width: ${props => props.size}px;
  outline: none;
  padding: 0;
  cursor: ${props => (props.disabled ? 'default' : 'pointer')};
  ${defaultTransition}
  &:hover,
  &:focus {
    background-color: ${props => (props.disabled ? COLOR.DISABLED : COLOR.shade(props.color, darkenAmount))}
   }
`;

const ICON_NAME = {
  ARROW: 'arrow',
  CHECK: 'check',
  CLOSE: 'close',
  PLANE: 'plane',
  PROFILE: 'profile',
  TEAM: 'team',
};

const RoundIconButton = ({icon, iconColor, iconHeight, iconWidth, ...props}) => (
  <Button {...props}>
    {(() => {
      switch (icon) {
        case ICON_NAME.CHECK: {
          return <CheckIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
        case ICON_NAME.CLOSE: {
          return <CloseIcon color={iconColor} height={iconHeight} width={iconWidth} />;
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
        case ICON_NAME.ARROW:
        default: {
          return <ArrowIcon color={iconColor} height={iconHeight} width={iconWidth} />;
        }
      }
    })()}
  </Button>
);

RoundIconButton.propTypes = {
  color: PropTypes.string,
  disabled: PropTypes.bool,
  icon: PropTypes.oneOf(Object.values(ICON_NAME)),
  iconColor: PropTypes.string,
  iconHeight: PropTypes.number,
  iconWidth: PropTypes.number,
  size: PropTypes.number,
};

RoundIconButton.defaultProps = {
  color: COLOR.BLUE,
  disabled: false,
  icon: ICON_NAME.ARROW,
  iconColor: COLOR.WHITE,
  iconHeight: null,
  iconWidth: null,
  size: 32,
};

export {RoundIconButton, ICON_NAME};
