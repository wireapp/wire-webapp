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

import {randomArrayElement, randomInt} from './randomUtil';

const MAX_HANDLE_LENGTH = 21;
const DEFAULT_NUMBER_VARIATIONS = 5;
const RANDOM_WORDS_1 = [
  ...['acid', 'agate', 'agile', 'amber', 'aqua', 'arid', 'avid', 'azure'],
  ...['baby', 'basic', 'beige', 'best', 'black', 'blond', 'blue', 'brass'],
  ...['brave', 'brown', 'busy', 'chief', 'chill', 'clear', 'cold', 'cool'],
  ...['coral', 'cosy', 'cozy', 'cream', 'curly', 'cyan', 'dear', 'dry'],
  ...['early', 'even', 'fancy', 'fast', 'fit', 'folk', 'gold', 'green'],
  ...['grey', 'happy', 'hazy', 'icy', 'iron', 'kind', 'large', 'lazy'],
  ...['lemon', 'light', 'lilac', 'lime', 'lord', 'lucid', 'mauve', 'melt'],
  ...['merry', 'mint', 'nice', 'noir', 'ochre', 'odd', 'olive', 'opal'],
  ...['peach', 'pearl', 'pink', 'plain', 'purple', 'quiet', 'rapid', 'red'],
  ...['rock', 'rose', 'ruby', 'rust', 'sand', 'sassy', 'shiny', 'shy'],
  ...['silly', 'slow', 'small', 'stone', 'sweet', 'swift', 'talc', 'tame'],
  ...['tiny', 'topaz', 'torn', 'total', 'vinyl', 'violet', 'warm', 'white'],
  ...['wise', 'witty', 'yellow', 'young', 'zinc'],
];
const RANDOM_WORDS_2 = [
  ...['alligator', 'alpaca', 'ant', 'antelope', 'asp', 'badger', 'bat', 'bear'],
  ...['bee', 'beetle', 'bird', 'bison', 'bobcat', 'buffalo', 'buzzard'],
  ...['camel', 'caribou', 'carp', 'cat', 'catfish', 'cheetah', 'clam', 'cobra'],
  ...['cod', 'condor', 'cow', 'coyote', 'crane', 'crayfish', 'cricket', 'crow'],
  ...['deer', 'dog', 'dolphin', 'donkey', 'dove', 'duck', 'eagle', 'eel'],
  ...['elk', 'falcon', 'ferret', 'finch', 'fly', 'fox', 'frog', 'gazelle'],
  ...['giraffe', 'gnu', 'goat', 'goose', 'gopher', 'grouse', 'gull', 'halibut'],
  ...['hamster', 'hare', 'hawk', 'heron', 'herring', 'horse', 'husky'],
  ...['impala', 'jackal', 'jaguar', 'kangaroo', 'koala', 'lemur', 'lion'],
  ...['lizard', 'llama', 'lobster', 'mackerel', 'mole', 'moose', 'moth'],
  ...['mouse', 'mule', 'mussel', 'newt', 'octopus', 'orca', 'ostrich', 'otter'],
  ...['owl', 'ox', 'oyster', 'panda', 'panther', 'parrot', 'pelican', 'penguin'],
  ...['pigeon', 'pike', 'pony', 'quail', 'rabbit', 'racoon', 'ram', 'raven'],
  ...['salmon', 'sardine', 'seal', 'shark', 'sheep', 'sloth', 'snail', 'snake'],
  ...['squid', 'sturgeon', 'swan', 'tiger', 'tilapia', 'toad', 'trout', 'tuna'],
  ...['turkey', 'turtle', 'walrus', 'wapiti', 'wasp', 'weasel', 'whale'],
  ...['wolf', 'wombat', 'yak', 'zebra'],
];

function getRandomWordCombination(): string {
  return `${randomArrayElement(RANDOM_WORDS_1)}${randomArrayElement(RANDOM_WORDS_2)}`;
}

function generateHandleVariations(handle: string, numberOfVariations: number = DEFAULT_NUMBER_VARIATIONS): string[] {
  return Array.from(Array(numberOfVariations), (_, index) => {
    const digitCount = index + 1;
    return appendRandomDigits(handle.slice(0, MAX_HANDLE_LENGTH - digitCount), digitCount);
  });
}

function appendRandomDigits(handle: string, additionalNumbers: number): string {
  const MAX_RANDOM_INT = 9;
  const randomDigits = Array.from(Array(additionalNumbers), () => randomInt(MAX_RANDOM_INT));
  return `${handle}${randomDigits.join('')}`;
}

function normalizeName(name: string): string {
  return getSlug(name)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, MAX_HANDLE_LENGTH);
}

export function createSuggestions(name: string): string[] {
  const normalizedName = normalizeName(name);
  const randomName = getRandomWordCombination();
  let suggestions: string[] = [];

  if (normalizedName) {
    suggestions.push(normalizedName);
    const normalizedNameVariations = generateHandleVariations(normalizedName);
    suggestions = suggestions.concat(normalizedNameVariations);
  }

  suggestions.push(randomName);
  const randomNameVariations = generateHandleVariations(randomName);
  return suggestions.concat(randomNameVariations);
}
