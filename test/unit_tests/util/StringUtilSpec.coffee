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
