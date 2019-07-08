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

import getSlug from 'speakingurl';

import {getRandomNumber} from 'Util/NumberUtil';
import {randomElement} from 'Util/ArrayUtil';

const MIN_HANDLE_LENGTH = 2;
const MAX_HANDLE_LENGTH = 21;

const RANDOM_WORDS_1 = 'acid|agate|agile|amber|aqua|arid|avid|azure|baby|basic|beige|best|black|blond|blue|brass|brave|brown|busy|chief|chill|clear|cold|cool|coral|cosy|cozy|cream|curly|cyan|dear|dry|early|even|fancy|fast|fit|folk|gold|green|grey|happy|hazy|icy|iron|kind|large|lazy|lemon|light|lilac|lime|lord|lucid|mauve|melt|merry|mint|nice|noir|ochre|odd|olive|opal|peach|pearl|pink|plain|purple|quiet|rapid|red|rock|rose|ruby|rust|sand|sassy|shiny|shy|silly|slow|small|stone|sweet|swift|talc|tame|tiny|topaz|torn|total|vinyl|violet|warm|white|wise|witty|yellow|young|zinc'.split(
  '|',
);
const RANDOM_WORDS_2 = 'alligator|alpaca|ant|antelope|asp|badger|bat|bear|bee|beetle|bird|bison|bobcat|buffalo|buzzard|camel|caribou|carp|cat|catfish|cheetah|clam|cobra|cod|condor|cow|coyote|crane|crayfish|cricket|crow|deer|dog|dolphin|donkey|dove|duck|eagle|eel|elk|falcon|ferret|finch|fly|fox|frog|gazelle|giraffe|gnu|goat|goose|gopher|grouse|gull|halibut|hamster|hare|hawk|heron|herring|horse|husky|impala|jackal|jaguar|kangaroo|koala|lemur|lion|lizard|llama|lobster|mackerel|mole|moose|moth|mouse|mule|mussel|newt|octopus|orca|ostrich|otter|owl|ox|oyster|panda|panther|parrot|pelican|penguin|pigeon|pike|pony|quail|rabbit|racoon|ram|raven|salmon|sardine|seal|shark|sheep|sloth|snail|snake|squid|sturgeon|swan|tiger|tilapia|toad|trout|tuna|turkey|turtle|walrus|wapiti|wasp|weasel|whale|wolf|wombat|yak|zebra'.split(
  '|',
);

const getRandomWordCombination = () => `${randomElement(RANDOM_WORDS_1)}${randomElement(RANDOM_WORDS_2)}`;

/**
 * Validates that a character can be used for a handle.
 * @param {string} character - Character candidate
 * @returns {boolean} True, if character can be used for a handle.
 */
export const validateCharacter = character => {
  const isAlphaNumeric = /[a-z0-9_]/.test(character);
  const isString = typeof character === 'string' && character.length === 1;
  return isAlphaNumeric && isString;
};

/**
 * Appends random digits from 1 to 9 to the end of the string.
 * @param {string} handle - Input
 * @param {number} additionalNumbers - number of digits to append
 * @returns {string} String appended with random digits.
 */
export const appendRandomDigits = (handle, additionalNumbers) => {
  const randomDigits = Array.from({length: additionalNumbers}, () => getRandomNumber(1, 8));
  return `${handle}${randomDigits.join('')}`;
};

/**
 * Creates a handle based on the users name.
 * @param {string} name - User name
 * @returns {string} User handle
 */
export const normalizeName = name =>
  getSlug(name)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, MAX_HANDLE_LENGTH);

/**
 * Validates that an input is a valid handle.
 * @param {string} handle - Character candidate
 * @returns {boolean} True, if handle is valid.
 */
export const validateHandle = (handle = '') => {
  if (!handle.length || handle.length < MIN_HANDLE_LENGTH || handle.length > MAX_HANDLE_LENGTH) {
    return false;
  }
  return handle.split('').every(validateCharacter);
};

/**
 * Creates variations of the given handle by appending random digits.
 * @param {string} handle - Input
 * @param {number} [numberOfVariations=5] - Number of variants that should be generated
 * @returns {Array<string>} Handle variations
 */
export const generateHandleVariations = (handle, numberOfVariations = 5) => {
  return Array.from({length: numberOfVariations}, (element, index) => {
    const value = index + 1;
    return appendRandomDigits(handle.slice(0, MAX_HANDLE_LENGTH - value), value);
  });
};

/**
 * Create a set of suggestions based on the name.
 * @param {string} name - Name to create suggestions for
 * @returns {Array<string>} Username suggestions
 */
export const createSuggestions = name => {
  const normalizedName = normalizeName(name);
  const randomName = getRandomWordCombination();
  const suggestions = [];

  if (normalizedName) {
    suggestions.push(normalizedName);
    const normalizedNameVariations = generateHandleVariations(normalizedName);
    suggestions.push(...normalizedNameVariations);
  }

  suggestions.push(appendRandomDigits(randomName));
  const randomNameVariations = generateHandleVariations(randomName);
  suggestions.push(...randomNameVariations);
  return suggestions;
};
