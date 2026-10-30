/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import assert from 'node:assert';

import {parseSerializedCallingMessage} from './callingMessage.schema';
import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';

const MAX_MESSAGE_BYTES = 1_048_576;

const serializeOtherVersion = (padding: string): string => {
  return JSON.stringify({type: CALL_MESSAGE_TYPE.CONF_START, version: '4.0', padding});
};

describe('parseSerializedCallingMessage', () => {
  it('preserves fields from an unfamiliar version with a different payload shape', () => {
    const content = {type: CALL_MESSAGE_TYPE.SETUP, version: '4.0', negotiation: {formats: ['example']}};
    const parsed = parseSerializedCallingMessage(JSON.stringify(content));

    assert(parsed.isOk);
    expect(parsed.value).toEqual(content);
  });

  it('rejects unknown fields for the supported version', () => {
    const parsed = parseSerializedCallingMessage(
      JSON.stringify({type: CALL_MESSAGE_TYPE.CANCEL, version: '3.0', resp: false, sessid: 'session', future: true}),
    );

    assert(parsed.isErr);
    expect(parsed.error).toMatchObject({reason: 'invalid_message', type: CALL_MESSAGE_TYPE.CANCEL, version: '3.0'});
    expect(parsed.error.issueCodes).toContain('unrecognized_keys');
  });

  it('keeps the message-type allowlist for unfamiliar versions', () => {
    const parsed = parseSerializedCallingMessage(JSON.stringify({type: 'UNKNOWN', version: '4.0'}));

    assert(parsed.isErr);
    expect(parsed.error.reason).toBe('invalid_message');
  });

  it.each(['3.0', '4.0'])('fully validates moderator payloads at version %s', version => {
    const parsed = parseSerializedCallingMessage(JSON.stringify({type: CALL_MESSAGE_TYPE.REMOTE_MUTE, version}));

    assert(parsed.isErr);
    expect(parsed.error.reason).toBe('invalid_message');
  });

  it('accepts a remote-mute target with a 200-character domain', () => {
    const domain = ['a'.repeat(50), 'b'.repeat(49), 'c'.repeat(49), 'd'.repeat(49)].join('.');
    const content = {type: CALL_MESSAGE_TYPE.REMOTE_MUTE, data: {targets: {[domain]: {user: ['client']}}}};
    const parsed = parseSerializedCallingMessage(JSON.stringify(content));

    assert(parsed.isOk);
    expect(parsed.value).toEqual(content);
  });

  it('rejects moderator domain keys beyond the domain limit', () => {
    const parsed = parseSerializedCallingMessage(
      JSON.stringify({type: CALL_MESSAGE_TYPE.REMOTE_MUTE, data: {targets: {['a'.repeat(254)]: {user: ['client']}}}}),
    );

    assert(parsed.isErr);
    expect(parsed.error.issueCodes).toContain('too_big');
  });

  it('retains native AVS identifier limits', () => {
    const parsed = parseSerializedCallingMessage(
      JSON.stringify({
        type: CALL_MESSAGE_TYPE.CANCEL,
        version: '3.0',
        resp: false,
        sessid: 'session',
        src_userid: 'a'.repeat(128),
      }),
    );

    assert(parsed.isErr);
    expect(parsed.error.issueCodes).toContain('too_big');
  });

  it('accepts an envelope at the serialized size limit', () => {
    const serialized = serializeOtherVersion('a'.repeat(MAX_MESSAGE_BYTES - serializeOtherVersion('').length));
    const parsed = parseSerializedCallingMessage(serialized);

    assert(parsed.isOk);
    expect(new TextEncoder().encode(serialized).byteLength).toBe(MAX_MESSAGE_BYTES);
  });

  it('rejects an envelope one byte over the serialized size limit', () => {
    const serialized = serializeOtherVersion('a'.repeat(MAX_MESSAGE_BYTES - serializeOtherVersion('').length + 1));
    const parsed = parseSerializedCallingMessage(serialized);

    assert(parsed.isErr);
    expect(parsed.error.reason).toBe('oversized_message');
  });

  it('counts UTF-8 bytes rather than characters for the size limit', () => {
    const serialized = serializeOtherVersion('€'.repeat(400_000));
    expect(serialized.length).toBeLessThan(MAX_MESSAGE_BYTES);
    const parsed = parseSerializedCallingMessage(serialized);

    assert(parsed.isErr);
    expect(parsed.error.reason).toBe('oversized_message');
  });

  it('rejects malformed JSON with a diagnostic reason', () => {
    const parsed = parseSerializedCallingMessage('{');

    assert(parsed.isErr);
    expect(parsed.error.reason).toBe('invalid_json');
  });

  it('omits untrusted values and record keys from diagnostics', () => {
    const parsed = parseSerializedCallingMessage(
      JSON.stringify({
        type: CALL_MESSAGE_TYPE.REMOTE_MUTE,
        version: 'private-version',
        data: {targets: {'private.example': {'private-user': ['private-client'.repeat(20)]}}},
      }),
    );

    assert(parsed.isErr);
    expect(parsed.error).toMatchObject({type: CALL_MESSAGE_TYPE.REMOTE_MUTE, version: 'unknown'});
    expect(parsed.error.issueCodes).toContain('too_big');
    expect(JSON.stringify(parsed.error)).not.toContain('private');
  });
});
