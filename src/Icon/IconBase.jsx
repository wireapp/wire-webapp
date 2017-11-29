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

import PropTypes from 'prop-types';
import React from 'react';

class IconBase extends React.PureComponent {
  height = 0;
  width = 0;

  static propTypes = {
    color: PropTypes.string,
    height: PropTypes.number,
    scale: PropTypes.number,
    style: PropTypes.object,
    width: PropTypes.number,
  };

  static defaultProps = {
    color: '#000',
    height: null,
    scale: 1,
    style: null,
    width: null,
  };

  render() {
    const {color, height, scale, style, width} = this.props;
    let newScale = scale;
    if (width || height) {
      const widthScale = width ? width / this.width : Infinity;
      const heightScale = height ? height / this.height : Infinity;
      newScale = Math.min(widthScale, heightScale);
    }
    return this.renderSVG(this.width * newScale, this.height * newScale, color, style);
  }

  renderSVG(width, height, color, style) {
    return null;
  }
}

export default IconBase;
