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

import {AssetService} from '../conversation';
import {LinkPreviewContent, LinkPreviewUploadedContent} from '../conversation/content';

export class LinkPreviewService {
  constructor(private readonly assetService: AssetService) {}

  public async uploadLinkPreviewImage(
    linkPreview: LinkPreviewContent,
    domain?: string,
  ): Promise<LinkPreviewUploadedContent> {
    const {image, ...preview} = linkPreview;
    if (!image) {
      return preview;
    }

    const uploadedLinkPreview: LinkPreviewUploadedContent = preview;
    const asset = await (await this.assetService.uploadAsset(linkPreview.image.data, {domain})).response;
    uploadedLinkPreview.imageUploaded = {
      asset,
      image,
    };
    return uploadedLinkPreview;
  }
}
