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
import React from 'react';
import {Text} from './Text';
import {defaultTransition} from '../Identity/motions';

const Link = ({component = 'a', ...props}) => {
  const StyledLink = Text.withComponent(component).extend`
    /* appearance */
    text-decoration: none;
    ${defaultTransition}

    /* positioning */

    &:visited,
    &:link,
    &:active {
      color: ${() => props.color};
    }
    &:hover {
      cursor: pointer;
      color: ${COLOR.GRAY_DARKEN_88};
    }
  `;
  return <StyledLink {...props} />;
};
Link.propTypes = {
  ...Text.propTypes,
};

Link.defaultProps = {
  ...Text.defaultProps,
};

export {Link};
