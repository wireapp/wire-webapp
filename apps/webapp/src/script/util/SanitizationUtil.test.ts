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

import {User} from 'Repositories/entity/User';
import {Declension, LocalizerUtil, t, getSelfName, getUserName} from 'Util/LocalizerUtil';

import {escapeRegex, safeWindowOpen} from './SanitizationUtil';

describe('SanitizationUtil', () => {
  describe('escapeRegex', () => {
    it('will return escaped regex strings', () => {
      const escapedRegex = escapeRegex(':)');

      expect(escapedRegex).toEqual(':\\)');
    });
  });

  describe('getUserName', () => {
    it('will return the name of the given user', () => {
      const userEntity = new User();
      userEntity.name(`<script>alert('Unsanitzed');</script>`);
      const escapedFirstName = getUserName(userEntity);

      expect(escapedFirstName).toEqual('&lt;script&gt;alert(&#x27;Unsanitzed&#x27;);&lt;/script&gt;');
      const unescapedFirstName = getUserName(userEntity, undefined, true);

      expect(unescapedFirstName).toEqual(`<script>alert('Unsanitzed');</script>`);
      userEntity.isMe = true;
      const escapedSelfName = getUserName(userEntity);

      expect(escapedSelfName).toEqual(t('conversationYouNominative'));
    });
  });

  describe('getSelfName', () => {
    it('will return the self name in the given declension', () => {
      const escapedNominativeName = getSelfName(Declension.NOMINATIVE);

      expect(escapedNominativeName).toEqual(t('conversationYouNominative'));

      const unescapedNominativeName = getSelfName(Declension.NOMINATIVE, true);

      expect(unescapedNominativeName).toEqual(t('conversationYouNominative'));

      const escapedDativeName = getSelfName(Declension.DATIVE);

      expect(escapedDativeName).toEqual(t('conversationYouDative'));

      spyOn(LocalizerUtil, 'translate').and.returnValue('<script>you</script>');
      const escapedAccusativeName = getSelfName(Declension.DATIVE);

      expect(escapedAccusativeName).toEqual('&lt;script&gt;you&lt;/script&gt;');

      const unescapedAccusativeName = getSelfName(Declension.DATIVE, true);

      expect(unescapedAccusativeName).toEqual('<script>you</script>');
    });
  });

  describe('safeWindowOpen', () => {
    it('does not contain a reference to the opening tab', () => {
      const mockedWindow = {
        focus: jest.fn(),
        opener: 'remove me',
      };
      jest.spyOn(window, 'open').mockImplementation(() => mockedWindow as any);
      const newWindow = safeWindowOpen('https://wire.com/');

      expect(newWindow.opener).toBeNull();
      expect(newWindow.focus).toHaveBeenCalled();
    });
  });
});
