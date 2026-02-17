/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {MLSStaleMessageError} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {Encoder} from 'bazinga64';

import {ErrorType, MlsErrorType} from '@wireapp/core-crypto';

import {createDefaultMlsErrorMapper} from './MlsErrorMapper';

import {
  CORE_CRYPTO_ERROR_NAMES,
  serializeAbortReason,
  UPLOAD_COMMIT_BUNDLE_ABORT_REASONS,
} from '../MLSService/CoreCryptoMLSError';

// Helpers
const id: QualifiedId = {id: 'conv-id', domain: 'wire.test'};
const groupIdBase64 = Encoder.toBase64(new Uint8Array([1, 2, 3, 4])).asString;

const mapper = createDefaultMlsErrorMapper();
function map(error: unknown, extra?: {groupId?: string}) {
  return mapper.map(error, {qualifiedConversationId: id, groupId: extra?.groupId});
}

describe('MlsErrorMapper', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('maps WrongEpoch via stale message class instance', () => {
    const err = new MLSStaleMessageError('stale');
    const mapped = map(err, {groupId: groupIdBase64});
    expect(mapped.type).toBe('WrongEpoch');
    expect(mapped.context?.qualifiedConversationId).toEqual(id);
    expect(mapped.context?.groupId).toBe(groupIdBase64);
  });

  it('maps GroupNotEstablished for broken conversation error', () => {
    const err: any = {
      type: ErrorType.Mls,
      context: {
        type: MlsErrorType.MessageRejected,
        context: {reason: serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.BROKEN_MLS_CONVERSATION})},
      },
    };
    const mapped = map(err);
    expect(mapped.type).toBe('GroupNotEstablished');
  });

  it('maps GroupOutOfSync with missing users list', () => {
    const missing: QualifiedId[] = [
      {id: 'u1', domain: 'wire.test'},
      {id: 'u2', domain: 'wire.test'},
    ];
    const err: any = {
      type: ErrorType.Mls,
      context: {
        type: MlsErrorType.MessageRejected,
        context: {
          reason: serializeAbortReason({
            message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_GROUP_OUT_OF_SYNC,
            missing_users: missing,
          }),
        },
      },
    };
    const mapped = map(err, {groupId: groupIdBase64});
    expect(mapped.type).toBe('GroupOutOfSync');
    expect(mapped.context?.missingUsers).toEqual(missing);
    expect(mapped.context?.groupId).toBe(groupIdBase64);
  });

  it('maps ConversationAlreadyExists and extracts groupId bytes', () => {
    const conversationIdArray = [1, 2, 3, 4];
    const expectedGroupId = Encoder.toBase64(new Uint8Array(conversationIdArray)).asString;
    const err: any = {
      type: ErrorType.Mls,
      context: {type: MlsErrorType.ConversationAlreadyExists, context: {conversationId: conversationIdArray}},
    };
    const mapped = map(err);
    expect(mapped.type).toBe('ConversationAlreadyExists');
    expect(mapped.context?.groupId).toBe(expectedGroupId);
  });

  it('maps OrphanWelcome', () => {
    const err: any = {type: ErrorType.Mls, context: {type: MlsErrorType.OrphanWelcome}};
    const mapped = map(err);
    expect(mapped.type).toBe('OrphanWelcome');
    expect(mapped.context?.qualifiedConversationId).toEqual(id);
  });

  it('falls back to Unknown for unmapped error', () => {
    const err = new Error('random');
    const mapped = map(err);
    expect(mapped.type).toBe(MlsErrorType.Other);
    expect(mapped.cause).toBe(err);
  });

  it('honors handler priority (WrongEpoch before GroupOutOfSync)', () => {
    const err: any = new Error('ambiguous');
    err.name = CORE_CRYPTO_ERROR_NAMES.MlsErrorWrongEpoch; // triggers WrongEpoch guard
    // Also craft message-rejected with out-of-sync to trigger GroupOutOfSync guard
    err.type = ErrorType.Mls;
    err.context = {
      type: MlsErrorType.MessageRejected,
      context: {
        reason: serializeAbortReason({
          message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_GROUP_OUT_OF_SYNC,
          missing_users: [],
        }),
      },
    };
    const mapped = map(err);
    expect(mapped.type).toBe('WrongEpoch');
  });
});
