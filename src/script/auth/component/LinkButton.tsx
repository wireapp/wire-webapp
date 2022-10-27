/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {LinkProps, linkStyle, Theme} from '@wireapp/react-ui-kit';

const linkButtonStyle = {
  background: 'none',
  border: 'none',
  margin: 0,
  padding: 0,
};

const LinkButton = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    css={(theme: Theme) => linkStyle(theme, props as unknown as LinkProps)}
    style={linkButtonStyle}
    {...props}
  />
);

export {LinkButton};
