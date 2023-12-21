/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {renderHook} from '@testing-library/react';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Theme, useTheme} from './useTheme';

describe('useTheme', () => {
  it.each([
    ['dark', 'theme-dark'],
    ['default', 'theme-default'],
  ] as const)('should set the initial theme to the body classes', (theme, bodyclass) => {
    renderHook(() => useTheme(() => theme));

    expect(document.body.className).toContain(bodyclass);
  });

  it('live updates as theme changes', () => {
    let theme: Theme = 'default';

    renderHook(() => useTheme(() => theme));

    expect(document.body.className).toContain('theme-default');

    theme = 'dark';
    amplify.publish(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME);
    expect(document.body.className).toContain('theme-dark');

    theme = 'default';
    amplify.publish(WebAppEvents.PROPERTIES.UPDATED);
    expect(document.body.className).toContain('theme-default');
  });
});
