/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import React from 'react';

import {CSS_FILL_PARENT} from 'Util/CSSMixin';

interface AvatarBackgroundProps {
  backgroundColor?: string;
  borderRadius?: string;
}

const AvatarBackground: React.FunctionComponent<AvatarBackgroundProps> = ({
  borderRadius = '50%',
  backgroundColor = 'currentColor',
}) => (
  <div
    css={{
      ...CSS_FILL_PARENT,
      backgroundColor,
      borderRadius,
      transform: 'scale(0.9916)',
    }}
  />
);

export {AvatarBackground};
