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

import {renderHook} from '@testing-library/react';
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import {useMeetNowModal} from 'Components/Meeting/meetNowModal/useMeetNowModal';
import {useMeetingActions} from 'Components/Meeting/useMeetingActions';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

const wallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: Date.parse('2026-06-16T10:00:00.000Z'),
});

const RootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest, wallClock}),
);

describe('useMeetingActions', () => {
  beforeEach(() => {
    useMeetNowModal.getState().close();
    useMeetNowModal.getState().reset();
  });

  it('opens the meet-now modal', () => {
    const {result} = renderHook(() => useMeetingActions(), {wrapper: RootProviderWrapper});

    expect(useMeetNowModal.getState().isOpen).toBe(false);

    result.current.handleMeetNow();

    expect(useMeetNowModal.getState().isOpen).toBe(true);
  });
});
