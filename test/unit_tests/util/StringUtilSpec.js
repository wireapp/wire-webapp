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

import {
  bytesToHex,
  compareTransliteration,
  startsWith,
  includesString,
  getRandomChar,
  truncate,
  formatString,
  removeLineBreaks,
  sortByPriority,
  utf8ToUtf16BE,
  obfuscate,
  replaceAccents,
} from 'Util/StringUtil';

import {lorem_ipsum} from '../../api/payloads';

describe('StringUtil', () => {
  describe('compareTransliteration', () => {
    it('René equals Rene', () => {
      expect(compareTransliteration('René', 'Rene')).toBeTruthy();
    });

    it('Παναγιώτα equals Panagiota', () => {
      expect(compareTransliteration('Παναγιώτα', 'Panagiota')).toBeTruthy();
    });

    it('ΠΑΝΑΓΙΩΤΑ equals PANAGIOTA', () => {
      expect(compareTransliteration('ΠΑΝΑΓΙΩΤΑ', 'PANAGIOTA')).toBeTruthy();
    });

    it('Björn equals Bjoern', () => {
      expect(compareTransliteration('Björn', 'Bjoern')).toBeTruthy();
    });

    it('Bjørn equals Bjorn', () => {
      expect(compareTransliteration('Bjørn', 'Bjorn')).toBeTruthy();
    });
  });

  describe('formatString', () => {
    it('returns string with replaced placeholder', () => {
      expect(formatString('foo={0}&bar={1}', 1, 2)).toBe('foo=1&bar=2');
    });
  });

  describe('getRandomChar', () => {
    it('always returns an alphanumeric character', () => {
      [...Array(1000).keys()].map(() => {
        expect(getRandomChar()).toMatch(/(\w|\d){1}/);
      });
    });
  });

  describe('includes', () => {
    const string = 'Club Zeta';

    it('returns true for positive matches', () => {
      expect(includesString(string, 'ub')).toBeTruthy();
      expect(includesString(string, 'Club Z')).toBeTruthy();
      expect(includesString(string, 'club z')).toBeTruthy();
    });

    it('returns false for no matches', () => {
      expect(includesString(string, 'wurst')).toBeFalsy();
    });
  });

  describe('obfuscate', () => {
    it('obfuscates a text keeping its length', () => {
      const text =
        'Bacon ipsum dolor amet sausage landjaeger ball tip brisket filet mignon, t-bone tenderloin tri-tip beef drumstick fatback burgdoggen ground round meatball. Tri-tip spare ribs ground round bresaola ball tip tail, sirloin chicken doner boudin turkey leberkas bacon alcatra. ';
      const obfuscated = obfuscate(text);

      expect(obfuscated).not.toBe(text);
    });

    it('obfuscates a text keeping its length (commas)', () => {
      const text = ',,,,,,';
      const obfuscated = obfuscate(text);

      expect(obfuscated).not.toBe(text);
    });

    it('obfuscates a text keeping its length (dots)', () => {
      const text = '......';
      const obfuscated = obfuscate(text);

      expect(obfuscated).not.toBe(text);
    });
  });

  describe('removeLineBreaks', () => {
    it('removes all the line breaks', () => {
      expect(removeLineBreaks('\nA\nB\nC\nD\n')).toBe('ABCD');
    });
  });

  describe('sortByPriority', () => {
    it('can sort strings', () => {
      const string_1 = 'a b';
      const string_2 = 'c d';

      expect(sortByPriority(string_1, string_2)).toEqual(-1);
      expect(sortByPriority(string_2, string_1)).toEqual(1);
      expect(sortByPriority(string_1, string_1)).toEqual(0);
      expect(sortByPriority(string_1, string_2, 'a')).toEqual(-1);
      expect(sortByPriority(string_1, string_2, 'c')).toEqual(1);
      expect(sortByPriority(string_1, string_2, 'A')).toEqual(-1);
      expect(sortByPriority(string_1, string_2, 'C')).toEqual(1);
    });
  });

  describe('startsWith', () => {
    const string = 'To be, or not to be, that is the question.';

    it('returns true for positive matches', () => {
      expect(startsWith(string, 'To be')).toBeTruthy();
      expect(startsWith(string, 'to be')).toBeTruthy();
    });

    it('returns false for no matches', () => {
      expect(startsWith(string, 'not to be')).toBeFalsy();
    });
  });

  describe('truncate', () => {
    it('returns the full string if it is shorter than the target length', () => {
      const text = truncate(`${lorem_ipsum.slice(0, 80)}`, 90);

      expect(text.length).toBe(80);
      expect(text.charAt(79)).not.toBe('…');
    });

    it('returns a truncated string of correct length if it is longer than the target length', () => {
      const text = truncate(`${lorem_ipsum.slice(0, 80)}`, 70);

      expect(text.length).toBe(64);
      expect(text.charAt(63)).toBe('…');
    });

    it('returns a truncated string of correct length if word boundary is disabled', () => {
      const text = truncate(`${lorem_ipsum.slice(0, 80)}`, 70, false);

      expect(text.length).toBe(70);
      expect(text.charAt(69)).toBe('…');
    });

    it('returns a truncated string of correct length if word boundary is enabled and there are no whitespaces in the string', () => {
      const text = truncate(`${lorem_ipsum.replace(/\s/g, '').slice(0, 80)}`, 70);

      expect(text.length).toBe(70);
      expect(text.charAt(69)).toBe('…');
    });
  });

  describe('bytesToHex', () => {
    it('converts string values to hex', () => {
      const stringValue = 'wire';
      const expectedResult = '77697265';

      const array = stringValue.split('').map(char => char.charCodeAt(0));
      const resultValue = bytesToHex(array);

      expect(resultValue).toBe(expectedResult);
    });
  });

  describe('utf8ToUtf16BE', () => {
    it('converts a string to a UTF16 BigEndian array', () => {
      const string = '👁🧑🏾yay üüü';
      const expected = [
        254, 255, 216, 61, 220, 65, 216, 62, 221, 209, 216, 60, 223, 254, 0, 121, 0, 97, 0, 121, 0, 32, 0, 252, 0, 252,
        0, 252,
      ];

      const result = utf8ToUtf16BE(string);

      expect(result).toEqual(expected);
    });
  });

  describe('replaceAccents', () => {
    it('converts strings with accents values to pure strings with replaced accents values', () => {
      expect(replaceAccents('täst')).toEqual('tast');
      expect(replaceAccents('tást')).toEqual('tast');
      expect(replaceAccents('tàst')).toEqual('tast');
      expect(replaceAccents('tãst')).toEqual('tast');
      expect(replaceAccents('tâst')).toEqual('tast');
      expect(replaceAccents('tÀst')).toEqual('tast');
      expect(replaceAccents('tÁst')).toEqual('tast');
      expect(replaceAccents('tÃst')).toEqual('tast');
      expect(replaceAccents('tÂst')).toEqual('tast');
      expect(replaceAccents('tëst')).toEqual('test');
      expect(replaceAccents('tést')).toEqual('test');
      expect(replaceAccents('tèst')).toEqual('test');
      expect(replaceAccents('têst')).toEqual('test');
      expect(replaceAccents('tÉst')).toEqual('test');
      expect(replaceAccents('tÈst')).toEqual('test');
      expect(replaceAccents('tÊst')).toEqual('test');
      expect(replaceAccents('tïst')).toEqual('tist');
      expect(replaceAccents('tíst')).toEqual('tist');
      expect(replaceAccents('tìst')).toEqual('tist');
      expect(replaceAccents('tîst')).toEqual('tist');
      expect(replaceAccents('tÍst')).toEqual('tist');
      expect(replaceAccents('tÌst')).toEqual('tist');
      expect(replaceAccents('tÎst')).toEqual('tist');
      expect(replaceAccents('töst')).toEqual('tost');
      expect(replaceAccents('tóst')).toEqual('tost');
      expect(replaceAccents('tòst')).toEqual('tost');
      expect(replaceAccents('tôst')).toEqual('tost');
      expect(replaceAccents('tõst')).toEqual('tost');
      expect(replaceAccents('tÓst')).toEqual('tost');
      expect(replaceAccents('tÒst')).toEqual('tost');
      expect(replaceAccents('tÔst')).toEqual('tost');
      expect(replaceAccents('tÕst')).toEqual('tost');
      expect(replaceAccents('túst')).toEqual('tust');
      expect(replaceAccents('tùst')).toEqual('tust');
      expect(replaceAccents('tûst')).toEqual('tust');
      expect(replaceAccents('tüst')).toEqual('tust');
      expect(replaceAccents('tÚst')).toEqual('tust');
      expect(replaceAccents('tÙst')).toEqual('tust');
      expect(replaceAccents('tÛst')).toEqual('tust');
      expect(replaceAccents('tÜst')).toEqual('tust');
      expect(replaceAccents('tçst')).toEqual('tcst');
      expect(replaceAccents('tÇst')).toEqual('tcst');
      expect(replaceAccents('tñst')).toEqual('tnst');
      expect(replaceAccents('tÑst')).toEqual('tnst');
    });
  });
});
