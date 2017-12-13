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

const IconHOC = (svgBody, realWidth = 0, realHeight = 0) => {
  const wrapper = ({color, scale, width, height, ...props}) => {
    let newScale = scale;
    if (width || height) {
      const widthScale = width ? width / realWidth : Infinity;
      const heightScale = height ? height / realHeight : Infinity;
      newScale = Math.min(widthScale, heightScale);
    }
    const newWidth = realWidth * newScale;
    const newHeight = realHeight * newScale;
    return (
      <svg width={newWidth} height={newHeight} fill={color} viewBox={`0 0 ${realWidth} ${realHeight}`} {...props}>
        {typeof svgBody === 'function' ? svgBody(props) : svgBody}
      </svg>
    );
  };
  wrapper.propTypes = {
    color: PropTypes.string,
    height: PropTypes.number,
    scale: PropTypes.number,
    width: PropTypes.number,
  };

  wrapper.defaultProps = {
    color: '#000',
    height: null,
    scale: 1,
    width: null,
  };
  return wrapper;
};

export default IconHOC;
