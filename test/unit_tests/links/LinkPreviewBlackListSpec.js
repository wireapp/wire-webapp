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

// grunt test_run:links/LinkPreviewBlackList

describe('is_blacklisted', () => {
  it('should return true if link is youtu.be', () => {
    const url = 'https://youtu.be/t4gjl-uwUHc';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(true);
  });

  it('should return true if link is YouTube', () => {
    const url = 'https://www.youtube.com/watch?v=t4gjl-uwUHc';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(true);
  });

  it('should return false if link is YouTube static', () => {
    const url = 'https://www.youtube.com/account';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(false);
  });

  it('should return true if link is Spotify', () => {
    const url = 'https://play.spotify.com/artist/7Ln80lUS6He07XvHI8qqHH/';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(true);
  });

  it('should return false if link is Spotify static', () => {
    const url = 'https://www.spotify.com/en/legal';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(false);
  });

  it('should return true if link is SoundCloud', () => {
    const url = 'https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(true);
  });

  it('should return false if link is SoundCloud static', () => {
    const url = 'https://soundcloud.com/discover';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(false);
  });

  it('should return true if link is Vimeo', () => {
    const url = 'https://vimeo.com/27999954';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(true);
  });

  it('should return false if link is Vimeo static', () => {
    const url = 'https://vimeo.com/upload';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(false);
  });

  it('should return false if link is wire.com', () => {
    const url = 'wire.com';

    expect(z.links.LinkPreviewBlackList.isBlacklisted(url)).toBe(false);
  });
});
