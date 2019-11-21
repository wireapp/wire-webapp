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

// tslint:disable:no-magic-numbers

import * as Proteus from '@wireapp/proteus';
import * as sodium from 'libsodium-wrappers-sumo';

beforeAll(async () => {
  await sodium.ready;
});

describe('Mac Key', () => {
  it('encodes a message', () => {
    const key_material_buffer = new ArrayBuffer(32);
    const typed_key_material = new Uint8Array(key_material_buffer);
    const mac_key = new Proteus.derived.MacKey(typed_key_material);
    const message = sodium.from_string('hello');

    const authentication_code = mac_key.sign(message);

    // prettier-ignore
    const expected = new Uint8Array([67, 82, 178, 110, 51, 254, 13, 118, 154, 137, 34, 166, 186, 41, 0, 65, 9, 240, 22, 136, 226, 106, 204, 158, 108, 179, 71, 229, 165, 175, 196, 218]);

    expect(authentication_code).toEqual(expected);
  });

  it('verifies correct data', () => {
    // prettier-ignore
    const signature = new Uint8Array([200, 47, 165, 205, 79, 32, 199, 25, 126, 101, 210, 67, 90, 11, 202, 247, 9, 67, 144, 173, 147, 174, 155, 244, 121, 55, 21, 198, 18, 27, 0, 99]);
    // prettier-ignore
    const msg = new Uint8Array([1, 165, 0, 80, 82, 255, 214, 194, 215, 199, 190, 124, 44, 155, 253, 88, 108, 182, 97, 218, 1, 0, 2, 1, 3, 161, 0, 88, 32, 81, 164, 93, 189, 218, 73, 99, 191, 236, 250, 188, 97, 212, 13, 88, 41, 115, 127, 228, 229, 168, 46, 142, 241, 211, 60, 155, 78, 219, 59, 171, 17, 4, 66, 130, 57]);
    // prettier-ignore
    const key = new Uint8Array([15, 61, 178, 141, 34, 114, 210, 82, 206, 161, 179, 78, 187, 60, 132, 17, 255, 23, 66, 215, 138, 84, 215, 117, 169, 50, 70, 165, 78, 243, 39, 242]);

    const mac_key = new Proteus.derived.MacKey(key);

    expect(mac_key.verify(signature, msg)).toBe(true);
  });

  it('verifies a calculated signature', () => {
    // prettier-ignore
    const msg = new Uint8Array([1, 165, 0, 80, 82, 255, 214, 194, 215, 199, 190, 124, 44, 155, 253, 88, 108, 182, 97, 218, 1, 0, 2, 1, 3, 161, 0, 88, 32, 81, 164, 93, 189, 218, 73, 99, 191, 236, 250, 188, 97, 212, 13, 88, 41, 115, 127, 228, 229, 168, 46, 142, 241, 211, 60, 155, 78, 219, 59, 171, 17, 4, 66, 130, 57]);
    // prettier-ignore
    const key = new Uint8Array([15, 61, 178, 141, 34, 114, 210, 82, 206, 161, 179, 78, 187, 60, 132, 17, 255, 23, 66, 215, 138, 84, 215, 117, 169, 50, 70, 165, 78, 243, 39, 242]);

    const mac_key = new Proteus.derived.MacKey(key);

    const signature = mac_key.sign(msg);

    expect(mac_key.verify(signature, msg)).toBe(true);
  });

  it('verifies calculated data', async () => {
    const mac_key = new Proteus.derived.MacKey(new Uint8Array(32).fill(1));
    const msg = sodium.from_string('This is my great message in Proteus!');
    const signature = mac_key.sign(msg);

    expect(mac_key.verify(signature, msg)).toBe(true);
  });
});
