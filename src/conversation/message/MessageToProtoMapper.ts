/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {Article, Asset, LinkPreview, Mention, Quote, Text, Tweet} from '@wireapp/protocol-messaging';

import {EditedTextContent, LinkPreviewUploadedContent, TextContent} from '../content';
import {GenericMessageType} from '../GenericMessageType';

export class MessageToProtoMapper {
  static mapLinkPreviews(linkPreviews: LinkPreviewUploadedContent[]): LinkPreview[] {
    const builtLinkPreviews = [];

    for (const linkPreview of linkPreviews) {
      const linkPreviewMessage = LinkPreview.create({
        permanentUrl: linkPreview.permanentUrl,
        summary: linkPreview.summary,
        title: linkPreview.title,
        url: linkPreview.url,
        urlOffset: linkPreview.urlOffset,
      });

      if (linkPreview.tweet) {
        linkPreviewMessage.tweet = Tweet.create({
          author: linkPreview.tweet.author,
          username: linkPreview.tweet.username,
        });
        linkPreviewMessage.metaData = 'tweet';
      }

      if (linkPreview.imageUploaded) {
        const {asset, image} = linkPreview.imageUploaded;

        const imageMetadata = Asset.ImageMetaData.create({
          height: image.height,
          width: image.width,
        });

        const original = Asset.Original.create({
          [GenericMessageType.IMAGE]: imageMetadata,
          mimeType: image.type,
          size: image.data.length,
        });

        const remoteData = Asset.RemoteData.create({
          assetId: asset.key,
          assetToken: asset.token,
          assetDomain: asset.domain,
          otrKey: asset.keyBytes,
          sha256: asset.sha256,
        });

        const assetMessage = Asset.create({
          original,
          uploaded: remoteData,
        });

        linkPreviewMessage.image = assetMessage;
      }

      linkPreviewMessage.article = Article.create({
        image: linkPreviewMessage.image,
        permanentUrl: linkPreviewMessage.permanentUrl,
        summary: linkPreviewMessage.summary,
        title: linkPreviewMessage.title,
      });

      builtLinkPreviews.push(linkPreviewMessage);
    }

    return builtLinkPreviews;
  }

  static mapText(payloadBundle: TextContent | EditedTextContent): Text {
    const {expectsReadConfirmation, legalHoldStatus, linkPreviews, mentions, quote, text} = payloadBundle;

    const textMessage = Text.create({
      content: text,
      expectsReadConfirmation,
      legalHoldStatus,
    });

    if (linkPreviews?.length) {
      textMessage.linkPreview = MessageToProtoMapper.mapLinkPreviews(linkPreviews);
    }

    if (mentions?.length) {
      textMessage.mentions = mentions.map(mention => Mention.create(mention));
    }

    if (quote) {
      textMessage.quote = Quote.create({
        quotedMessageId: quote.quotedMessageId,
        quotedMessageSha256: quote.quotedMessageSha256,
      });
    }

    return textMessage;
  }
}
