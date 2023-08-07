/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {jsx as JSX} from '@emotion/react';
import {create} from 'react-test-renderer';

import {StyledApp, THEME_ID} from '../Layout';

/* eslint-disable no-unsanitized/method */
export const matchComponent = (component: JSX.Element, themeId = THEME_ID.LIGHT) =>
  (expect as any)(create(<StyledApp themeId={themeId}>{component}</StyledApp>).toJSON()).toMatchSnapshot();
