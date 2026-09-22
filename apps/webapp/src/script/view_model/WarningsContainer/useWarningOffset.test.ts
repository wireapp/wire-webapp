/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {cleanup, renderHook} from '@testing-library/react';

import {useWarningsState} from './WarningsState';
import {TYPE} from './WarningsTypes';
import {useWarningOffset} from './useWarningOffset';

describe('useWarningOffset', () => {
  afterEach(() => {
    cleanup();
    useWarningsState.setState({name: '', warnings: []});
  });

  it('returns no offset when there are no warnings', () => {
    const {result} = renderHook(() => useWarningOffset());

    expect(result.current).toEqual({hasLargeOffset: false, hasSmallOffset: false});
  });

  it.each([
    [TYPE.LIFECYCLE_UPDATE, false, true],
    [TYPE.REQUEST_CAMERA, true, false],
    [TYPE.CONNECTIVITY_RECOVERY, false, false],
  ])('returns the expected offset for %s', (warning, hasLargeOffset, hasSmallOffset) => {
    useWarningsState.setState({name: '', warnings: [warning]});

    const {result} = renderHook(() => useWarningOffset());

    expect(result.current).toEqual({hasLargeOffset, hasSmallOffset});
  });
});
