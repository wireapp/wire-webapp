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

import {COLOR} from '../Identity';
import PropTypes from 'prop-types';
import styled from 'styled-components';

const Text = styled.span`
  /* appearance */
  color: ${props => props.color};
  font-size: ${props => props.fontSize};
  font-weight: ${props => (props.bold ? '600' : props.light ? '300' : '400')};
  opacity: ${props => (props.muted ? '0.5' : '1')};
  text-align: ${props => (props.center ? 'center' : 'left')};
  text-transform: ${props => props.textTransform};
  ${props => props.noWrap && 'white-space: nowrap;'};
  ${props =>
    props.truncate &&
    `
        overflow: hidden;
        text-overflow: ellipsis;
      `};
`;

Text.propTypes = {
  bold: PropTypes.bool,
  center: PropTypes.bool,
  color: PropTypes.string,
  fontSize: PropTypes.string,
  light: PropTypes.bool,
  muted: PropTypes.bool,
  noWrap: PropTypes.bool,
  textTransform: PropTypes.oneOf(['lowercase', 'uppercase', 'capitalize', 'inherit', 'none', 'unset']),
  truncate: PropTypes.bool,
};

Text.defaultProps = {
  bold: false,
  center: false,
  color: COLOR.TEXT,
  fontSize: '16px',
  light: false,
  muted: false,
  noWrap: false,
  textTransform: 'none',
  truncate: false,
};

const Bold = Text.withComponent('strong');
Bold.defaultProps = {
  ...Text.defaultProps,
  bold: true,
};

const Small = Text.withComponent('small');
Small.defaultProps = {
  ...Text.defaultProps,
  fontSize: '12px',
};

const Muted = Text.extend``;
Muted.defaultProps = {
  ...Text.defaultProps,
  muted: true,
};

const Uppercase = Text.extend``;
Uppercase.defaultProps = {
  ...Text.defaultProps,
  textTransform: 'uppercase',
};

export {Bold, Muted, Small, Text, Uppercase};
