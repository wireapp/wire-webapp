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

import {WebAppEvents} from '@wireapp/webapp-events';

import {refreshApplication} from './applicationRefresh';

describe('refreshApplication', () => {
  it('publishes refresh rather than restart in the desktop application', () => {
    const publishedLifecycleEvents: string[] = [];
    let reloadWindowLocationCallCount = 0;
    let focusWindowCallCount = 0;

    function publishLifecycleEvent(lifecycleEventName: string): void {
      publishedLifecycleEvents.push(lifecycleEventName);
    }

    function reloadWindowLocation(): void {
      reloadWindowLocationCallCount += 1;
    }

    function focusWindow(): void {
      focusWindowCallCount += 1;
    }

    refreshApplication({
      isDesktopApplication: () => {
        return true;
      },
      publishLifecycleEvent,
      reloadWindowLocation,
      focusWindow,
    });

    expect(publishedLifecycleEvents).toEqual([WebAppEvents.LIFECYCLE.REFRESH]);
    expect(publishedLifecycleEvents).not.toContain(WebAppEvents.LIFECYCLE.RESTART);
    expect(reloadWindowLocationCallCount).toBe(0);
    expect(focusWindowCallCount).toBe(0);
  });

  it('reloads and focuses the browser window outside the desktop application', () => {
    const publishedLifecycleEvents: string[] = [];
    let reloadWindowLocationCallCount = 0;
    let focusWindowCallCount = 0;

    function publishLifecycleEvent(lifecycleEventName: string): void {
      publishedLifecycleEvents.push(lifecycleEventName);
    }

    function reloadWindowLocation(): void {
      reloadWindowLocationCallCount += 1;
    }

    function focusWindow(): void {
      focusWindowCallCount += 1;
    }

    refreshApplication({
      isDesktopApplication: () => {
        return false;
      },
      publishLifecycleEvent,
      reloadWindowLocation,
      focusWindow,
    });

    expect(publishedLifecycleEvents).toEqual([]);
    expect(reloadWindowLocationCallCount).toBe(1);
    expect(focusWindowCallCount).toBe(1);
  });
});
