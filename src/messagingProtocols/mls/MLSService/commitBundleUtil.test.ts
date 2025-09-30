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

import {mls} from '@wireapp/protocol-messaging/web/mls';
import {Encoder} from 'bazinga64';

import {CommitBundle, RatchetTreeType, GroupInfoEncryptionType, Welcome, GroupInfo} from '@wireapp/core-crypto';

import {toProtobufCommitBundle} from './commitBundleUtil';

describe('toProtobufCommitBundle', () => {
  it('encode commit bundles', () => {
    const payload: CommitBundle = {
      commit: Uint8Array.from([0]),
      welcome: new Welcome(Uint8Array.from([1])),
      groupInfo: {
        ratchetTreeType: RatchetTreeType.Full,
        payload: new GroupInfo(Uint8Array.from([2])),
        encryptionType: GroupInfoEncryptionType.Plaintext,
      },
    };
    const result = toProtobufCommitBundle(payload);
    const {commit, welcome, groupInfoBundle} = mls.CommitBundle.decode(result);

    expect(Encoder.toBase64(commit)).toEqual(Encoder.toBase64(payload.commit));
    expect(Encoder.toBase64(welcome)).toEqual(Encoder.toBase64(payload.welcome?.copyBytes()!));
    expect(Encoder.toBase64(groupInfoBundle.groupInfo)).toEqual(
      Encoder.toBase64(payload.groupInfo.payload.copyBytes()),
    );
    expect(groupInfoBundle.ratchetTreeType).toEqual(mls.RatchetTreeType.FULL);
    expect(groupInfoBundle.groupInfoType).toEqual(mls.GroupInfoType.PUBLIC_GROUP_STATE);
  });
});
