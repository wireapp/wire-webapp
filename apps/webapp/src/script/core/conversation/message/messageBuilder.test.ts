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

import {Asset, GenericMessage} from '@wireapp/protocol-messaging';

import {buildFileDataMessage} from './messageBuilder';

import {FileAssetContent} from '../content';

describe('buildFileDataMessage', () => {
  const content: FileAssetContent = {
    asset: {
      key: 'original',
      domain: 'files.wire.test',
      keyBytes: new Uint8Array(32).fill(1),
      sha256: new Uint8Array(32).fill(2),
      cipherText: new Uint8Array(),
    },
    file: {data: Buffer.from('pdf')},
    metaData: {name: 'report.pdf', type: 'application/pdf', length: 3},
  };

  it('includes a separately encrypted preview in the encoded file message', () => {
    const preview: Asset.IPreview = {
      mimeType: 'image/png',
      size: 128,
      image: {width: 320, height: 180},
      remote: {
        assetId: 'thumbnail',
        assetDomain: 'preview.wire.test',
        assetToken: 'preview-token',
        otrKey: new Uint8Array(32).fill(3),
        sha256: new Uint8Array(32).fill(4),
      },
    };

    const message = buildFileDataMessage({...content, preview}, 'message-id');
    const decoded = GenericMessage.decode(GenericMessage.encode(message).finish());

    expect(decoded.asset?.uploaded?.assetId).toBe('original');
    expect(decoded.asset?.preview?.remote?.assetId).toBe('thumbnail');
    expect(decoded.asset?.preview?.remote?.assetDomain).toBe('preview.wire.test');
    expect(decoded.asset?.preview?.remote?.assetToken).toBe('preview-token');
    expect(decoded.asset?.preview?.remote?.otrKey).toEqual(preview.remote?.otrKey);
    expect(decoded.asset?.preview?.remote?.sha256).toEqual(preview.remote?.sha256);
    expect(decoded.asset?.preview?.mimeType).toBe('image/png');
    expect(decoded.asset?.preview?.image?.width).toBe(320);
  });

  it('keeps files without previews compatible with existing messages', () => {
    const message = buildFileDataMessage(content, 'message-id');
    const decoded = GenericMessage.decode(GenericMessage.encode(message).finish());

    expect(decoded.asset?.uploaded?.assetId).toBe('original');
    expect(decoded.asset?.preview).toBeNull();
  });
});
