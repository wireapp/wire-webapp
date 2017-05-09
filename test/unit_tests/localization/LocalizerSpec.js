/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:localization/Localizer

'use strict';

describe('Localizer', function() {
  it('can get localized strings', function() {
    const text = z.localization.Localizer.get_text(z.string.upload_choose);
    expect(text).toBe(z.string.upload_choose);
  });

  it('can replace line single strings in the localization', function() {
    const text = z.localization.Localizer.get_text({
      id: 'Talk, message, share.',
      replace: {
        content: '<br>',
        placeholder: '%nl',
      },
    });
    expect(text).toBe('Talk, message, share.');
  });

  it('can replace multiple strings in the localization', function() {
    const text = z.localization.Localizer.get_text({
      id: 'I’m on Wire. Search for %email or visit %url to connect with me.',
      replace: [
        {
          content: entities.user.john_doe.email,
          placeholder: '%email',
        },
        {
          content: 'html://LINK',
          placeholder: '%url',
        },
      ],
    });
    expect(text).toBe('I’m on Wire. Search for jd@wire.com or visit html://LINK to connect with me.');
  });

  it('can replace user names in the localization', function() {
    const text = z.localization.Localizer.get_text({
      id: '%@.first_name won’t see you in search results and won’t be able to send you messages.',
      replace: {
        content: '<span class=\"user\"></span>',
        placeholder: '%@.first_name',
      },
    });
    expect(text).toBe('<span class="user"></span> won’t see you in search results and won’t be able to send you messages.');
  });
});
