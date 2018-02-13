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

import IconHOC from './IconHOC';
import PropTypes from 'prop-types';
import React from 'react';

const rotation = {
  right: 0,
  down: 90, // eslint-disable-line sort-keys
  left: 180,
  up: 270,
};

const size = 16;
const arrow = (
  {direction} // eslint-disable-line react/prop-types
) => <path transform={`rotate(${rotation[direction]} 8 8)`} d="M5.8 1.5L7.3 0l8 8-8 8-1.5-1.5L11.3 9H.7V7h10.6" />;
const ArrowIcon = IconHOC(arrow, size, size);

ArrowIcon.propTypes.direction = PropTypes.oneOf(Object.keys(rotation));
ArrowIcon.defaultProps.direction = 'right';

export {ArrowIcon};
