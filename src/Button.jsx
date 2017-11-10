/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import {COLOR} from './variables';
import PropTypes from 'prop-types';
import {Text} from './Text';
import {transition} from './mixins';

const Button = Text.withComponent('button').extend`
  /* appearance */
  background-color: ${props => props.backgroundColor};
  border-radius: 8px;
  border: 0;
  box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.12);
  cursor: pointer;
  display: inline-block;
  text-decoration: none;
  ${transition}

  /* positioning */
  height: 48px;
  line-height: 48px;
  max-width: 100%;
  padding: 0 32px;
  width: ${props => (props.block ? '100%' : 'auto')};

  &:hover,
  &:focus {
    /* appearance */
    text-decoration: none;
    box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.2);
  }
`;

Button.propTypes = {
  ...Text.propTypes,
  backgroundColor: PropTypes.string,
  block: PropTypes.bool,
  noCapital: PropTypes.bool,
};

Button.defaultProps = {
  ...Text.defaultProps,
  backgroundColor: COLOR.GRAY,
  block: false,
  bold: true,
  center: true,
  color: COLOR.WHITE,
  noCapital: false,
  nowrap: true,
  textTransform: 'uppercase',
  truncate: true,
};

const ButtonLink = Button.withComponent('a');

export {Button, ButtonLink};
