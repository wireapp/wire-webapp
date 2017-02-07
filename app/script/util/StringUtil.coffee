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
z.util ?= {}


z.util.StringUtil =
  capitalize_first_char: (string = '') ->
    return "#{string.charAt(0).toUpperCase()}#{string.substring 1}"

  compare_transliteration: (name_a, name_b) ->
    return z.util.StringUtil.includes window.getSlug(name_a), window.getSlug name_b

  format: ->
    string = arguments[0]
    for index in [0...arguments.length]
      reg = new RegExp "\\{#{index}\\}", 'gm'
      string = string.replace reg, arguments[++index]
    return string

  get_first_character: (string) ->
    reg = new RegExp /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/
    find_emoji_in_string = reg.exec string
    if find_emoji_in_string and find_emoji_in_string.index is 0
      return find_emoji_in_string[0]
    return string[0]

  # @note Returns random alphanumeric character [A-Z, a-z, 0-9]
  get_random_character: ->
    until z.util.NumberUtil.in_range(char_index, 1, 9) or z.util.NumberUtil.in_range(char_index, 65, 90) or z.util.NumberUtil.in_range char_index, 97, 122
      char_index = Math.floor Math.random() * 122
    return if char_index <= 9 then char_index else String.fromCharCode char_index

  includes: (string = '', query = '') ->
    return string.toLowerCase().includes query.toLowerCase()

  obfuscate: (text) ->
    alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'x', 'y', 'z']
    obfuscated = ''

    for character in text
      if character.match /[\n\r\s]+/gi
        obfuscated += character
      else
        obfuscated += z.util.ArrayUtil.random_element alphabet

    return obfuscated

  remove_line_breaks: (string = '') ->
    return string.replace /(\r\n|\n|\r)/gm, ''

  sort_by_priority: (string_a = '', string_b = '', query) ->
    string_a = string_a.toLowerCase()
    string_b = string_b.toLowerCase()

    if query
      if z.util.StringUtil.starts_with string_a, query
        return -1 unless z.util.StringUtil.starts_with string_b, query
      else if z.util.StringUtil.starts_with string_b, query
        return 1 unless z.util.StringUtil.starts_with string_a, query
    return -1 if string_a < string_b
    return 1 if string_a > string_b
    return 0

  starts_with: (string = '', query) ->
    return string.toLowerCase().startsWith query.toLowerCase()

  trim_line_breaks: (string = '') ->
    return string.replace /^\s+|\s+$/g, ''

  truncate: (string, output_length, word_boundary = true) ->
    if string.length > output_length
      trunc_index = output_length - 1
      if word_boundary and string.lastIndexOf(' ', output_length - 1) > output_length - 25
        trunc_index = string.lastIndexOf ' ', output_length - 1
      string = "#{string.substr 0, trunc_index}…"
    return string
