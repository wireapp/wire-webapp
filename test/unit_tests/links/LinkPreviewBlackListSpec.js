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

'use strict';

// grunt test_init && grunt test_run:links/LinkPreviewBlackList

describe('is_blacklisted', () => {
  it('should return true if link is youtu.be', () => {
    const url = 'https://youtu.be/t4gjl-uwUHc';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBeTruthy();
  });

  it('should return true if link is youtube', () => {
    const url = 'https://www.youtube.com/watch?v=t4gjl-uwUHc';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBeTruthy();
  });

  it('should return true if link is spotify', () => {
    const url = 'spotify.com';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBeTruthy();
  });

  it('should return true if link is soundcloud', () => {
    const url = 'soundcloud.com';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBeTruthy();
  });

  it('should return true if link is vimeo', () => {
    const url = 'vimeo.com';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBeTruthy();
  });

  it('should return false if link is wire.com', () => {
    const url = 'wire.com';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBeFalsy();
  });
});
