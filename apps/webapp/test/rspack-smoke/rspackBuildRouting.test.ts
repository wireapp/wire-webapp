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
 */

import {isRspackStaticAssetPath} from '../e2e_tests/utils/rspackBuildRouting';

describe('isRspackStaticAssetPath', () => {
  it.each(['/audio/notification.mp3', '/assets/app-icon.svg', '/min/auth.js', '/worker/video.js'])(
    'routes application build asset %s to Rspack output',
    requestPathname => {
      expect(isRspackStaticAssetPath(requestPathname)).toBe(true);
    },
  );

  it.each(['/auth/', '/config.js', '/libs/wire/telemetry/embed.js', '/api-version', '/backend/api/users'])(
    'leaves application and backend route %s on the configured test server',
    requestPathname => {
      expect(isRspackStaticAssetPath(requestPathname)).toBe(false);
    },
  );
});
