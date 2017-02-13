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

window.z ?= {}
z.search ?= {}

z.search.FullTextSearch = do ->

  DELIMITER = ' '

  search: (text, query) ->
    regex = query.trim().split(DELIMITER).map((word) -> "(\\b#{word})").join '|'
    return new RegExp(regex, 'gmi').test(text)

  tokenize: (text) ->
    words = text.trim().split DELIMITER
    tokens = []

    words.forEach (word) ->
      tokens.push word

      normalized_words = window.getSlug word

      if word isnt normalized_words
        tokens.push normalized_words

    return tokens
