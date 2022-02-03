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

import {isBlacklisted} from './blackList';

describe('is_blacklisted', () => {
  it('blacklists youtu.be links', () => {
    const url = 'https://youtu.be/t4gjl-uwUHc';

    expect(isBlacklisted(url)).toBe(true);
  });

  it('blacklists YouTube video links', () => {
    const url = 'https://www.youtube.com/watch?v=t4gjl-uwUHc';

    expect(isBlacklisted(url)).toBe(true);
  });

  it("doesn't blacklist YouTube static links", () => {
    const url = 'https://www.youtube.com/account';

    expect(isBlacklisted(url)).toBe(false);
  });

  it('blacklists Spotify artist links', () => {
    const url = 'https://play.spotify.com/artist/7Ln80lUS6He07XvHI8qqHH/';

    expect(isBlacklisted(url)).toBe(true);
  });

  it('blacklists Spotify song links', () => {
    const url = 'https://open.spotify.com/track/5FVd6KXrgO9B3JPmC8OPst';

    expect(isBlacklisted(url)).toBe(true);
  });

  it("doesn't blacklist Spotify static links", () => {
    const url = 'https://www.spotify.com/en/legal';

    expect(isBlacklisted(url)).toBe(false);
  });

  it('blacklists SoundCloud', () => {
    const url = 'https://soundcloud.com/ago_music/ago-royal-oats-ft-waldo-prod';

    expect(isBlacklisted(url)).toBe(true);
  });

  it("doesn't blacklist SoundCloud static links", () => {
    const url = 'https://soundcloud.com/discover';

    expect(isBlacklisted(url)).toBe(false);
  });

  it('blacklists Vimeo video links', () => {
    const url = 'https://vimeo.com/27999954';

    expect(isBlacklisted(url)).toBe(true);
  });

  it('blacklists Vimeo embed video links', () => {
    const url = 'https://player.vimeo.com/video/27999954';

    expect(isBlacklisted(url)).toBe(true);
  });

  it('blacklists Vimeo channel video links', () => {
    const url = 'https://vimeo.com/channels/staffpicks/278174511';

    expect(isBlacklisted(url)).toBe(true);
  });

  it('blacklists Vimeo embed links', () => {
    const url = 'https://player.vimeo.com/video/27999954';

    expect(isBlacklisted(url)).toBe(true);
  });

  it("doesn't blacklist Vimeo static links", () => {
    const url = 'https://vimeo.com/upload';

    expect(isBlacklisted(url)).toBe(false);
  });

  it("doesn't blacklist wire.com", () => {
    const url = 'wire.com';

    expect(isBlacklisted(url)).toBe(false);
  });
});
