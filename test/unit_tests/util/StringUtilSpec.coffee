#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# grunt test_init && grunt test_run:util/StringUtil

describe 'z.util.StringUtil', ->
  describe 'compare_transliteration', ->
    it 'René equals Rene', ->
      expect(z.util.StringUtil.compare_transliteration 'René', 'Rene').toBeTruthy()

    it 'Παναγιώτα equals Panagiota', ->
      expect(z.util.StringUtil.compare_transliteration 'Παναγιώτα', 'Panagiota').toBeTruthy()

    it 'ΠΑΝΑΓΙΩΤΑ equals PANAGIOTA', ->
      expect(z.util.StringUtil.compare_transliteration 'ΠΑΝΑΓΙΩΤΑ', 'PANAGIOTA').toBeTruthy()

    it 'Björn equals Bjoern', ->
      expect(z.util.StringUtil.compare_transliteration 'Björn', 'Bjoern').toBeTruthy()

    it 'Bjørn equals Bjorn', ->
      expect(z.util.StringUtil.compare_transliteration 'Bjørn', 'Bjorn').toBeTruthy()


  describe 'format', ->
    it 'returns string with replaced placeholder', ->
      expect(z.util.StringUtil.format 'foo={0}&bar={1}', 1, 2).toBe 'foo=1&bar=2'


  describe 'get_random_character', ->
    it 'always returns an alphanumeric character', ->
      expect(z.util.StringUtil.get_random_character()).toMatch(/(\w|\d){1}/) for [0...1000]


  describe 'includes', ->
    string = 'Club Zeta'

    it 'returns true for positive matches', ->
      expect(z.util.StringUtil.includes string, 'ub').toBeTruthy()
      expect(z.util.StringUtil.includes string, 'Club Z').toBeTruthy()
      expect(z.util.StringUtil.includes string, 'club z').toBeTruthy()

    it 'returns false for no matches', ->
      expect(z.util.StringUtil.includes string, 'wurst').toBeFalsy()


  describe 'obfuscate', ->
    it 'obfuscates a text preserving it\'s whitespaces', ->
      text = 'You Are The Sunshine Of My Life'
      obfuscated = z.util.StringUtil.obfuscate text
      whitespaces = obfuscated.match /[\n\r\s]+/gi

      expect(obfuscated).not.toBe text
      expect(whitespaces.length).toBe 6

    it 'obfuscates a text keeping its length', ->
      text = 'Bacon ipsum dolor amet sausage landjaeger ball tip brisket filet mignon, t-bone tenderloin tri-tip beef drumstick fatback burgdoggen ground round meatball. Tri-tip spare ribs ground round bresaola ball tip tail, sirloin chicken doner boudin turkey leberkas bacon alcatra. '
      obfuscated = z.util.StringUtil.obfuscate text
      expect(obfuscated).not.toBe text
      expect(obfuscated.length).toBe text.length

    it 'obfuscates a text keeping its length (commas)', ->
      text = ',,,,,,'
      obfuscated = z.util.StringUtil.obfuscate text
      expect(obfuscated).not.toBe text
      expect(obfuscated.length).toBe text.length

    it 'obfuscates a text keeping its length (dots)', ->
      text = '......'
      obfuscated = z.util.StringUtil.obfuscate text
      expect(obfuscated).not.toBe text
      expect(obfuscated.length).toBe text.length


  describe 'remove_line_breaks', ->
    it 'removes all the line breaks', ->
      expect(z.util.StringUtil.remove_line_breaks '\nA\nB\nC\nD\n').toBe 'ABCD'


  describe 'sort_by_priority', ->
    it 'can sort strings', ->
      string_1 = 'a b'
      string_2 = 'c d'

      expect(z.util.StringUtil.sort_by_priority string_1, string_2).toEqual -1
      expect(z.util.StringUtil.sort_by_priority string_2, string_1).toEqual 1
      expect(z.util.StringUtil.sort_by_priority string_1, string_1).toEqual 0
      expect(z.util.StringUtil.sort_by_priority string_1, string_2, 'a').toEqual -1
      expect(z.util.StringUtil.sort_by_priority string_1, string_2, 'c').toEqual 1
      expect(z.util.StringUtil.sort_by_priority string_1, string_2, 'A').toEqual -1
      expect(z.util.StringUtil.sort_by_priority string_1, string_2, 'C').toEqual 1


  describe 'starts_with', ->
    string = 'To be, or not to be, that is the question.'

    it 'returns true for positive matches', ->
      expect(z.util.StringUtil.starts_with string, 'To be').toBeTruthy()
      expect(z.util.StringUtil.starts_with string, 'to be').toBeTruthy()

    it 'returns false for no matches', ->
      expect(z.util.StringUtil.starts_with string, 'not to be').toBeFalsy()


  describe 'z.util.trim_line_breaks', ->
    it 'removes line breaks at the beginning and/or end', ->
      expect(z.util.StringUtil.trim_line_breaks '\n\n\n\n\nB\nC\nD').toBe 'B\nC\nD'
      expect(z.util.StringUtil.trim_line_breaks 'B\nC\nD\n\n\n\n\n').toBe 'B\nC\nD'
      expect(z.util.StringUtil.trim_line_breaks '\n\n\n\nB\nC\n\n\n\n\n').toBe 'B\nC'

    it 'does not remove line breaks in between', ->
      expect(z.util.StringUtil.trim_line_breaks 'A\nB\nC\nD').toBe 'A\nB\nC\nD'


  describe 'truncate', ->
    it 'returns the full string if it is shorter than the target length', ->
      text = z.util.StringUtil.truncate "#{lorem_ipsum.substr 0, 80}", 90
      expect(text.length).toBe 80
      expect(text.charAt 79).not.toBe '…'

    it 'returns a truncated string of correct length if it is longer than the target length', ->
      text = z.util.StringUtil.truncate "#{lorem_ipsum.substr 0, 80}", 70
      expect(text.length).toBe 64
      expect(text.charAt 63).toBe '…'

    it 'returns a truncated string of correct length if word boundary is disabled', ->
      text = z.util.StringUtil.truncate "#{lorem_ipsum.substr 0, 80}", 70, false
      expect(text.length).toBe 70
      expect(text.charAt 69).toBe '…'

    it 'returns a truncated string of correct length if word boundary is disabled and there are no whitespaces in the string', ->
      text = z.util.StringUtil.truncate "#{lorem_ipsum.replace(/\s/g, '').substr 0, 80}", 70
      expect(text.length).toBe 70
      expect(text.charAt 69).toBe '…'
