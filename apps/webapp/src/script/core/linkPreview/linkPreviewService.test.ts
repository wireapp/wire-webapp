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

import {AssetService} from '../conversation';
import {LinkPreviewContent} from '../conversation/content';
import {EncryptedAssetUploaded} from '../cryptography';

import {LinkPreviewService} from './linkPreviewService';

const conversationIdentifier: QualifiedId = {
  domain: 'wire.com',
  id: 'conversation-id',
};

const linkPreviewWithMissingTitle: LinkPreviewContent = {
  url: 'https://wire.com',
  urlOffset: 0,
  title: null,
  image: {
    data: new Uint8Array([1, 2, 3]),
    height: 100,
    type: 'image/png',
    width: 100,
  },
};

describe('LinkPreviewService', () => {
  it('uses an empty filename for audit uploads when the link preview title is missing', async () => {
    const uploadedAsset: EncryptedAssetUploaded = {
      cipherText: new Uint8Array([1, 2, 3]),
      domain: 'wire.com',
      key: 'asset-key',
      keyBytes: new Uint8Array([4, 5, 6]),
      sha256: new Uint8Array([7, 8, 9]),
      token: 'asset-token',
    };

    const uploadAsset = jest.fn().mockResolvedValue({
      cancel: jest.fn(),
      response: Promise.resolve(uploadedAsset),
    });

    const assetService: AssetService = {uploadAsset} as unknown as AssetService;
    const linkPreviewService = new LinkPreviewService(assetService);

    await linkPreviewService.uploadLinkPreviewImage(linkPreviewWithMissingTitle, conversationIdentifier, true);

    expect(uploadAsset).toHaveBeenCalledWith(linkPreviewWithMissingTitle.image.data, {
      domain: conversationIdentifier.domain,
      auditData: {
        conversationId: conversationIdentifier,
        filename: '',
        filetype: linkPreviewWithMissingTitle.image.type,
      },
    });
  });
});
