/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

const inlineReplacements = [
  {name: 'slight smile', shortcut: ':)'},
  {name: 'slight smile', shortcut: ':-)'},
  {name: 'smile', shortcut: ':D'},
  {name: 'smile', shortcut: ':-D'},
  {name: 'grinning', shortcut: ':-d'},
  {name: 'sunglasses', shortcut: 'B-)'},
  {name: 'sunglasses', shortcut: 'b-)'},
  {name: 'sunglasses', shortcut: '8-)'},
  {name: 'disappointed', shortcut: ':('},
  {name: 'disappointed', shortcut: ':-('},
  {name: 'wink', shortcut: ';)'},
  {name: 'wink', shortcut: ';-)'},
  {name: 'wink', shortcut: ';-]'},
  {name: 'wink', shortcut: ';]'},
  {name: 'confused', shortcut: ':/'},
  {name: 'confused', shortcut: ':-/'},
  {name: 'stuck out tongue', shortcut: ':P'},
  {name: 'stuck out tongue', shortcut: ':-P'},
  {name: 'stuck out tongue', shortcut: ':-p'},
  {name: 'stuck out tongue winking eye', shortcut: ';P'},
  {name: 'stuck out tongue winking eye', shortcut: ';-P'},
  {name: 'stuck out tongue winking eye', shortcut: ';-p'},
  {name: 'open mouth', shortcut: ':O'},
  {name: 'open mouth', shortcut: ':-o'},
  {name: 'innocent', shortcut: 'O:)'},
  {name: 'innocent', shortcut: 'O:-)'},
  {name: 'innocent', shortcut: 'o:)'},
  {name: 'innocent', shortcut: 'o:-)'},
  {name: 'smirk', shortcut: ';^)'},
  {name: 'angry', shortcut: ':@'},
  {name: 'rage', shortcut: '>:('},
  {name: 'smiling imp', shortcut: '}:-)'},
  {name: 'smiling imp', shortcut: '}:)'},
  {name: 'smiling imp', shortcut: '3:-)'},
  {name: 'smiling imp', shortcut: '3:)'},
  {name: 'cry', shortcut: ":'-("},
  {name: 'cry', shortcut: ":'("},
  {name: 'cry', shortcut: ';('},
  {name: 'joy', shortcut: ":'-)"},
  {name: 'joy', shortcut: ":')"},
  {name: 'kissing heart', shortcut: ':*'},
  {name: 'kissing heart', shortcut: ':^*'},
  {name: 'kissing heart', shortcut: ':-*'},
  {name: 'neutral face', shortcut: ':-|'},
  {name: 'neutral face', shortcut: ':|'},
  {name: 'flushed', shortcut: ':$'},
  {name: 'no mouth', shortcut: ':-X'},
  {name: 'no mouth', shortcut: ':X'},
  {name: 'no mouth', shortcut: ':-#'},
  {name: 'no mouth', shortcut: ':#'},
  {name: 'raised hands', shortcut: '\\o/'},
  {name: 'heart', shortcut: '<3'},
  {name: 'broken heart', shortcut: '</3'},
];

export {inlineReplacements};
