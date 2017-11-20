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

import IconBase from './IconBase';
import PropTypes from 'prop-types';
import React from 'react';

class ArrowIcon extends IconBase {
  /* eslint-disable no-magic-numbers */
  static propTypes = {
    ...IconBase.propTypes,
    direction: PropTypes.oneOf(['left', 'right', 'up', 'down', 'n', 'e', 'w', 's']),
  };
  static defaultProps = {
    ...IconBase.defaultProps,
    direction: 'right',
  };

  width = 16;
  height = 16;
  renderSVG(width, height, color) {
    let rotation = 0;
    switch (this.props.direction) {
      case 's':
      case 'down':
        rotation = 90;
        break;
      case 'w':
      case 'left':
        rotation = 180;
        break;
      case 'n':
      case 'up':
        rotation = 270;
    }
    return (
      <svg width={width} height={height} viewBox="0 0 16 16">
        <path transform={`rotate(${rotation} 8 8)`} fill={color} d="M5.8 1.5L7.3 0l8 8-8 8-1.5-1.5L11.3 9H.7V7h10.6" />
      </svg>
    );
  }
}

export {ArrowIcon};
