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
z.user ?= {}

###
Client side user handle generation.
###
z.user.UserHandleGenerator = do ->

  MAX_HANDLE_LENGTH = 21

  RANDOM_WORDS_1 = ['acid', 'agate', 'agile', 'amber', 'aqua', 'arid', 'avid', 'azure', 'baby', 'basic', 'beige', 'best', 'black', 'blond', 'blue', 'brass', 'brave', 'brown', 'busy', 'chief', 'chill', 'clear', 'cold', 'cool', 'coral', 'cosy', 'cozy', 'cream', 'curly', 'cyan', 'dear', 'dry', 'early', 'even', 'fancy', 'fast', 'fit', 'folk', 'gold', 'green', 'grey', 'happy', 'hazy', 'icy', 'iron', 'kind', 'large', 'lazy', 'lemon', 'light', 'lilac', 'lime', 'lord', 'lucid', 'mauve', 'melt', 'merry', 'mint', 'nice', 'noir', 'ochre', 'odd', 'olive', 'opal', 'peach', 'pearl', 'pink', 'plain', 'purple', 'quiet', 'rapid', 'red', 'rock', 'rose', 'ruby', 'rust', 'sand', 'sassy', 'shiny', 'shy', 'silly', 'slow', 'small', 'stone', 'sweet', 'swift', 'talc', 'tame', 'tiny', 'topaz', 'torn', 'total', 'vinyl', 'violet', 'warm', 'white', 'wise', 'witty', 'yellow', 'young', 'zinc']
  RANDOM_WORDS_2 = ['alligator', 'alpaca', 'ant', 'antelope', 'asp', 'badger', 'bat', 'bear', 'bee', 'beetle', 'bird', 'bison', 'bobcat', 'buffalo', 'buzzard', 'camel', 'caribou', 'carp', 'cat', 'catfish', 'cheetah', 'clam', 'cobra', 'cod', 'condor', 'cow', 'coyote', 'crane', 'crayfish', 'cricket', 'crow', 'deer', 'dog', 'dolphin', 'donkey', 'dove', 'duck', 'eagle', 'eel', 'elk', 'falcon', 'ferret', 'finch', 'fly', 'fox', 'frog', 'gazelle', 'giraffe', 'gnu', 'goat', 'goose', 'gopher', 'grouse', 'gull', 'halibut', 'hamster', 'hare', 'hawk', 'heron', 'herring', 'horse', 'husky', 'impala', 'jackal', 'jaguar', 'kangaroo', 'koala', 'lemur', 'lion', 'lizard', 'llama', 'lobster', 'mackerel', 'mole', 'moose', 'moth', 'mouse', 'mule', 'mussel', 'newt', 'octopus', 'orca', 'ostrich', 'otter', 'owl', 'ox', 'oyster', 'panda', 'panther', 'parrot', 'pelican', 'penguin', 'pigeon', 'pike', 'pony', 'quail', 'rabbit', 'racoon', 'ram', 'raven', 'salmon', 'sardine', 'seal', 'shark', 'sheep', 'sloth', 'snail', 'snake', 'squid', 'sturgeon', 'swan', 'tiger', 'tilapia', 'toad', 'trout', 'tuna', 'turkey', 'turtle', 'walrus', 'wapiti', 'wasp', 'weasel', 'whale', 'wolf', 'wombat', 'yak', 'zebra']

  get_random_word_combination = ->
    return "#{z.util.ArrayUtil.random_element(RANDOM_WORDS_1)}#{z.util.ArrayUtil.random_element(RANDOM_WORDS_2)}"

  ###
  Creates variations of the given handle by appending random digits.
  @param handle [String]
  @param number_of_variations [Number]
  ###
  generate_handle_variations = (handle, number_of_variations = 5) ->
    return [1..number_of_variations].map (i) ->
      return append_random_digits(handle.slice(0, MAX_HANDLE_LENGTH - i), i)

  ###
  Appends random digits from 1 to 9 to the end of the string.
  @param str [String]
  @param number [Number] number of digits to append
  ###
  append_random_digits = (str, number) ->
    random_digits = [0...number].map -> z.util.get_random_int(1, 9)
    return "#{str}#{random_digits.join('')}"

  ###
  Create handle based on the users name.
  @param name [String]
  ###
  normalize_name = (name) ->
    return window.getSlug name
      .toLowerCase()
      .replace new RegExp(/[^a-z0-9_]/, 'g'), ''
      .substring 0, MAX_HANDLE_LENGTH

  ###
  Validate that character can be used for handle.
  @param character [String]
  ###
  validate_character = (character) ->
    return _.isString(character) and character.length is 1 and /[a-z0-9_]/.test character

  ###
  Create a set of suggestions based on the name
  @param name [String]
  ###
  create_suggestions = (name) ->
    suggestions = []
    normalized_name = normalize_name name
    random_name = get_random_word_combination()

    if normalized_name
      suggestions.push normalized_name
      normalized_name_variations = generate_handle_variations normalized_name
      suggestions = suggestions.concat normalized_name_variations

    suggestions.push append_random_digits(random_name)
    random_name_variations = generate_handle_variations random_name
    suggestions = suggestions.concat random_name_variations

    return suggestions

  return {} =
    append_random_digits: append_random_digits
    create_suggestions: create_suggestions
    generate_handle_variations: generate_handle_variations
    normalize_name: normalize_name
    validate_character: validate_character
