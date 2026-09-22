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

type ApplicationRefreshDependencies = {
  readonly isDesktopApplication: () => boolean;
  readonly supportsWebViewRefresh: () => boolean;
  readonly publishLifecycleEvent: (lifecycleEventName: string) => void;
  readonly reloadWindowLocation: () => void;
  readonly focusWindow: () => void;
};

export function refreshApplication(dependencies: ApplicationRefreshDependencies): void {
  const {focusWindow, isDesktopApplication, publishLifecycleEvent, reloadWindowLocation, supportsWebViewRefresh} =
    dependencies;

  if (!isDesktopApplication()) {
    reloadWindowLocation();
    focusWindow();
    return;
  }

  if (supportsWebViewRefresh()) {
    publishLifecycleEvent(WebAppEvents.LIFECYCLE.REFRESH);
    return;
  }

  publishLifecycleEvent(WebAppEvents.LIFECYCLE.RESTART);
}
