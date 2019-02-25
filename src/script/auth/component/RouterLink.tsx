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

import {Link, LinkProps as UILinkProps} from '@wireapp/react-ui-kit';
import React from 'react';
import {Link as RRLink, LinkProps as RouterLinkProps} from 'react-router-dom';

interface LinkProps extends UILinkProps, RouterLinkProps {}

const RouterLink = (props: LinkProps) => <Link component={RRLink} {...props} />;

export {RouterLink};
