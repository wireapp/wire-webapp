/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

/* eslint-disable no-unused-expressions */

import {RecursivePartial, OptionalKeys, RequiredKeys, XOR} from './TypeUtil';

interface UserSettings {
  one: {
    four: number;
    three: number;
  };
}

type SomePartial = Partial<UserSettings>;
// @ts-expect-error
const invalidPartial: SomePartial['one'] = {three: 3};

type AllPartial = RecursivePartial<UserSettings>;
const allPartial: AllPartial['one'] = {three: 3};

interface MessageSettings {
  content: string;
  expired?: boolean;
  recipient: string;
  sent?: boolean;
}

const optionalKeys: OptionalKeys<MessageSettings>[] = ['expired'];
const requiredKeys: RequiredKeys<MessageSettings>[] = ['content'];

// @ts-expect-error
const invalidKeys: OptionalKeys<MessageSettings>[] = ['content'];

const xorKeys: XOR<MessageSettings, UserSettings> = {
  content: 'test',
  recipient: 'test',
};

const invalidXorKeys: XOR<MessageSettings, UserSettings> = {
  content: 'test',
  recipient: 'test',
  // @ts-expect-error
  one: {
    four: 3,
  },
};

allPartial;
optionalKeys;
requiredKeys;
invalidKeys;
xorKeys;
invalidXorKeys;
