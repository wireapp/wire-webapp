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
import {Text} from './Text';

const Label = ({component, ...props}) => {
  const StyledLabel = Text.withComponent(component).extend`
    /* positioning */
    width: 100%;
    padding: 24px 0 8px;
  `;
  return <StyledLabel {...props} />;
};

Label.propTypes = {
  ...Text.propTypes,
  component: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
};

Label.defaultProps = {
  ...Text.defaultProps,
  bold: true,
  color: COLOR.LINK,
  component: 'span',
  fontSize: '12px',
};

export {Label};
