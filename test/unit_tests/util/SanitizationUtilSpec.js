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

// grunt test_run:util/SanitizationUtil

'use strict';

describe('z.util.SanitizationUtil', () => {
  describe('escapeRegex', () => {
    it('will return escaped regex strings', () => {
      const escapedRegex = z.util.SanitizationUtil.escapeString(':)');

      expect(escapedRegex).toEqual(':)');
    });
  });

  describe('escapeString', () => {
    it('will return escaped strings', () => {
      const escapedString = z.util.SanitizationUtil.escapeString(`<script>alert('Unsanitzed');</script>`);

      expect(escapedString).toEqual('&lt;script&gt;alert(&#x27;Unsanitzed&#x27;);&lt;/script&gt;');
    });
  });

  describe('getFirstName', () => {
    it('will return the first name of the given user', () => {
      const userEntity = new z.entity.User();
      userEntity.name(`<script>alert('Unsanitzed');</script>`);
      const escapedFirstName = z.util.SanitizationUtil.getFirstName(userEntity);

      expect(escapedFirstName).toEqual('&lt;script&gt;alert(&#x27;Unsanitzed&#x27;);&lt;/script&gt;');
      const unescapedFirstName = z.util.SanitizationUtil.getFirstName(userEntity, undefined, true);

      expect(unescapedFirstName).toEqual(`<script>alert('Unsanitzed');</script>`);
      userEntity.is_me = true;
      const escapedSelfName = z.util.SanitizationUtil.getFirstName(userEntity);

      expect(escapedSelfName).toEqual('you');
    });
  });

  describe('getSelfName', () => {
    it('will return the self name in the given declension', () => {
      const escapedNominativeName = z.util.SanitizationUtil.getSelfName(z.string.Declension.NOMINATIVE);

      expect(escapedNominativeName).toEqual('you');
      const unescapedNominativeName = z.util.SanitizationUtil.getSelfName(z.string.Declension.NOMINATIVE, true);

      expect(unescapedNominativeName).toEqual('you');
      const escapedDativeName = z.util.SanitizationUtil.getSelfName(z.string.Declension.DATIVE);

      expect(escapedDativeName).toEqual('you');
      spyOn(z.l10n, 'text').and.returnValue('<script>you</script>');
      const escapedAccusativeName = z.util.SanitizationUtil.getSelfName(z.string.Declension.DATIVE);

      expect(escapedAccusativeName).toEqual('&lt;script&gt;you&lt;/script&gt;');
      const unescapedAccusativeName = z.util.SanitizationUtil.getSelfName(z.string.Declension.DATIVE, true);

      expect(unescapedAccusativeName).toEqual('<script>you</script>');
    });
  });

  describe('safeWindowOpen', () => {
    let newWindow = undefined;
    afterEach(() => {
      if (newWindow) {
        newWindow.close();
      }
    });

    it('does not contain a reference to the opening tab', () => {
      newWindow = z.util.SanitizationUtil.safeWindowOpen('https://wire.com/');

      expect(newWindow.opener).toBeNull();
    });
  });
});
