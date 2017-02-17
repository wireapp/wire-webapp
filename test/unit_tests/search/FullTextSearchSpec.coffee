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

# grunt test_init && grunt test_run:search/FullTextSearch

describe 'z.search.FullTextSearch', ->

  describe 'search', ->

    it 'should return false if text is not found', ->
      expect(z.search.FullTextSearch.search('aa', '')).toBeFalsy()
      expect(z.search.FullTextSearch.search('aa', undefined)).toBeFalsy()
      expect(z.search.FullTextSearch.search('aa', 'bb')).toBeFalsy()

    it 'should return false if word does not start with the given query', ->
      expect(z.search.FullTextSearch.search('Tree', 'ee')).toBeFalsy()

    it 'should find text', ->
      expect(z.search.FullTextSearch.search('aa bb', 'aa')).toBeTruthy()
