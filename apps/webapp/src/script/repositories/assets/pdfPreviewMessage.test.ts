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

import {GenericMessage} from '@wireapp/protocol-messaging';

import {buildFileDataMessage} from '../../core/conversation/message/messageBuilder';
import {CryptographyMapper} from '../cryptography/CryptographyMapper';
import {EventMapper} from '../conversation/EventMapper';
import {ClientEvent} from '../event/Client';
import {requireValueForTest} from '../../page/testSupport/rootContextTestSupport';
import {createCoreTestFixture} from '../../util/test/createCoreTestFixture';
import {translateForTest} from '../../util/test/translateForTest';
import {createMessageAddEvent} from '../../../../test/helper/EventGenerator';

describe('PDF preview message mapping', () => {
  it('restores independent preview encryption data through protobuf and event mapping', async () => {
    const previewKey = new Uint8Array(32).fill(3);
    const previewHash = new Uint8Array(32).fill(4);
    const message = buildFileDataMessage(
      {
        asset: {
          key: 'original',
          domain: 'files.wire.test',
          keyBytes: new Uint8Array(32).fill(1),
          sha256: new Uint8Array(32).fill(2),
          cipherText: new Uint8Array(),
        },
        file: {data: Buffer.from('%PDF')},
        metaData: {name: 'report.pdf', type: 'application/pdf', length: 4},
        preview: {
          mimeType: 'image/png',
          size: 128,
          image: {width: 320, height: 180},
          remote: {
            assetId: 'preview',
            assetDomain: 'preview.wire.test',
            assetToken: 'preview-token',
            otrKey: previewKey,
            sha256: previewHash,
          },
        },
      },
      'message-id',
    );
    const decoded = GenericMessage.decode(GenericMessage.encode(message).finish());
    const mapper = new CryptographyMapper(createCoreTestFixture({}));
    const event = requireValueForTest(await mapper.mapGenericMessage(decoded, createMessageAddEvent()));

    if (event.type !== ClientEvent.CONVERSATION.ASSET_ADD) {
      throw new Error('Expected a file asset event');
    }
    const asset = requireValueForTest(
      new EventMapper(undefined, translateForTest)._mapAsset({...event, ephemeral_expires: undefined}),
    );

    expect(asset.file_type).toBe('application/pdf');
    expect(asset.original_resource().identifier).toBe('original');
    expect(asset.preview_resource().urlData).toEqual({
      assetKey: 'preview',
      assetDomain: 'preview.wire.test',
      assetToken: 'preview-token',
    });
    expect(asset.preview_resource().otrKey).toEqual(previewKey);
    expect(asset.preview_resource().sha256).toEqual(previewHash);
  });
});
