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

interface AvatarBorderProps {
  borderRadius?: string;
  isTransparent?: boolean;
}

export const AvatarBorder: React.FunctionComponent<AvatarBorderProps> = ({
  borderRadius = '50%',
  isTransparent = false,
}) => (
  <div
    css={{
      ...CSS_FILL_PARENT,
      border: `1px solid ${isTransparent ? 'rgba(0, 0, 0, 0.08)' : 'var(--border-color)'}`,
      borderRadius,
    }}
  />
);
