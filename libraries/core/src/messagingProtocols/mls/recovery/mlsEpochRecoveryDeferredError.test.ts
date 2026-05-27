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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {MlsEpochRecoveryDeferredError} from './mlsEpochRecoveryDeferredError';

describe('MlsEpochRecoveryDeferredError', () => {
  it('exposes conversation context', () => {
    const conversationId: QualifiedId = {id: 'conv', domain: 'wire.test'};
    const error = new MlsEpochRecoveryDeferredError(conversationId);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('MlsEpochRecoveryDeferredError');
    expect(error.conversationId).toEqual(conversationId);
    expect(error.subconvId).toBeUndefined();
  });
});
