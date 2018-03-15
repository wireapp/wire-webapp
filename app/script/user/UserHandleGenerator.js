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

'use strict';

window.z = window.z || {};
window.z.user = z.user || {};

(function() {
  const MIN_HANDLE_LENGTH = 2;
  const MAX_HANDLE_LENGTH = 21;

  const RANDOM_WORDS_1 = [
    'acid',
    'agate',
    'agile',
    'amber',
    'aqua',
    'arid',
    'avid',
    'azure',
    'baby',
    'basic',
    'beige',
    'best',
    'black',
    'blond',
    'blue',
    'brass',
    'brave',
    'brown',
    'busy',
    'chief',
    'chill',
    'clear',
    'cold',
    'cool',
    'coral',
    'cosy',
    'cozy',
    'cream',
    'curly',
    'cyan',
    'dear',
    'dry',
    'early',
    'even',
    'fancy',
    'fast',
    'fit',
    'folk',
    'gold',
    'green',
    'grey',
    'happy',
    'hazy',
    'icy',
    'iron',
    'kind',
    'large',
    'lazy',
    'lemon',
    'light',
    'lilac',
    'lime',
    'lord',
    'lucid',
    'mauve',
    'melt',
    'merry',
    'mint',
    'nice',
    'noir',
    'ochre',
    'odd',
    'olive',
    'opal',
    'peach',
    'pearl',
    'pink',
    'plain',
    'purple',
    'quiet',
    'rapid',
    'red',
    'rock',
    'rose',
    'ruby',
    'rust',
    'sand',
    'sassy',
    'shiny',
    'shy',
    'silly',
    'slow',
    'small',
    'stone',
    'sweet',
    'swift',
    'talc',
    'tame',
    'tiny',
    'topaz',
    'torn',
    'total',
    'vinyl',
    'violet',
    'warm',
    'white',
    'wise',
    'witty',
    'yellow',
    'young',
    'zinc',
  ];
  const RANDOM_WORDS_2 = [
    'alligator',
    'alpaca',
    'ant',
    'antelope',
    'asp',
    'badger',
    'bat',
    'bear',
    'bee',
    'beetle',
    'bird',
    'bison',
    'bobcat',
    'buffalo',
    'buzzard',
    'camel',
    'caribou',
    'carp',
    'cat',
    'catfish',
    'cheetah',
    'clam',
    'cobra',
    'cod',
    'condor',
    'cow',
    'coyote',
    'crane',
    'crayfish',
    'cricket',
    'crow',
    'deer',
    'dog',
    'dolphin',
    'donkey',
    'dove',
    'duck',
    'eagle',
    'eel',
    'elk',
    'falcon',
    'ferret',
    'finch',
    'fly',
    'fox',
    'frog',
    'gazelle',
    'giraffe',
    'gnu',
    'goat',
    'goose',
    'gopher',
    'grouse',
    'gull',
    'halibut',
    'hamster',
    'hare',
    'hawk',
    'heron',
    'herring',
    'horse',
    'husky',
    'impala',
    'jackal',
    'jaguar',
    'kangaroo',
    'koala',
    'lemur',
    'lion',
    'lizard',
    'llama',
    'lobster',
    'mackerel',
    'mole',
    'moose',
    'moth',
    'mouse',
    'mule',
    'mussel',
    'newt',
    'octopus',
    'orca',
    'ostrich',
    'otter',
    'owl',
    'ox',
    'oyster',
    'panda',
    'panther',
    'parrot',
    'pelican',
    'penguin',
    'pigeon',
    'pike',
    'pony',
    'quail',
    'rabbit',
    'racoon',
    'ram',
    'raven',
    'salmon',
    'sardine',
    'seal',
    'shark',
    'sheep',
    'sloth',
    'snail',
    'snake',
    'squid',
    'sturgeon',
    'swan',
    'tiger',
    'tilapia',
    'toad',
    'trout',
    'tuna',
    'turkey',
    'turtle',
    'walrus',
    'wapiti',
    'wasp',
    'weasel',
    'whale',
    'wolf',
    'wombat',
    'yak',
    'zebra',
  ];

  /**
   * Create a set of suggestions based on the name.
   * @param {string} name - Name to create suggestions for
   * @returns {Array<string>} Username suggestions
   */
  function create_suggestions(name) {
    const normalized_name = normalize_name(name);
    const random_name = get_random_word_combination();
    let suggestions = [];

    if (normalized_name) {
      suggestions.push(normalized_name);
      const normalized_name_variations = generate_handle_variations(normalized_name);
      suggestions = suggestions.concat(normalized_name_variations);
    }

    suggestions.push(append_random_digits(random_name));
    const random_name_variations = generate_handle_variations(random_name);
    return suggestions.concat(random_name_variations);
  }

  function get_random_word_combination() {
    return `${z.util.ArrayUtil.randomElement(RANDOM_WORDS_1)}${z.util.ArrayUtil.randomElement(RANDOM_WORDS_2)}`;
  }

  /**
   * Creates variations of the given handle by appending random digits.
   * @param {string} handle - Input
   * @param {number} [number_of_variations=5] - Number of variants that should be generated
   * @returns {Array<string>} Handle variations
   */
  function generate_handle_variations(handle, number_of_variations = 5) {
    return _.range(1, number_of_variations + 1).map(value => {
      return append_random_digits(handle.slice(0, MAX_HANDLE_LENGTH - value), value);
    });
  }

  /**
   * Appends random digits from 1 to 9 to the end of the string.
   * @param {string} handle - Input
   * @param {number} additional_numbers - number of digits to append
   * @returns {string} String appended with random digits.
   */
  function append_random_digits(handle, additional_numbers) {
    const random_digits = _.range(additional_numbers).map(() => z.util.get_random_int(1, 9));
    return `${handle}${random_digits.join('')}`;
  }

  /**
   * Creates a handle based on the users name.
   * @param {string} name - User name
   * @returns {string} User handle
   */
  function normalize_name(name) {
    return window
      .getSlug(name)
      .toLowerCase()
      .replace(new RegExp(/[^a-z0-9_]/, 'g'), '')
      .substring(0, MAX_HANDLE_LENGTH);
  }

  /**
   * Validates that a character can be used for a handle.
   * @param {string} character - Character candidate
   * @returns {boolean} True, if character can be used for a handle.
   */
  function validate_character(character) {
    const isAlphaNumeric = /[a-z0-9_]/.test(character);
    const isString = _.isString(character) && character.length === 1;
    return isAlphaNumeric && isString;
  }

  /**
   * Validates that an input is a valid handle.
   * @param {string} handle - Character candidate
   * @returns {boolean} True, if handle is valid.
   */
  function validate_handle(handle = '') {
    if (!handle.length || handle.length < MIN_HANDLE_LENGTH || handle.length > MAX_HANDLE_LENGTH) {
      return false;
    }

    for (const character of handle) {
      if (!validate_character(character)) {
        return false;
      }
    }

    return true;
  }

  z.user.UserHandleGenerator = {
    append_random_digits: append_random_digits,
    create_suggestions: create_suggestions,
    generate_handle_variations: generate_handle_variations,
    normalize_name: normalize_name,
    validate_character: validate_character,
    validate_handle: validate_handle,
  };
})();
