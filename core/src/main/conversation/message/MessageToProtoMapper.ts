import {Article, Asset, LinkPreview, Mention, Quote, Text, Tweet} from '@wireapp/protocol-messaging';
import {LinkPreviewUploadedContent} from '../content';
import {GenericMessageType} from '../GenericMessageType';
import {EditedTextMessage, TextMessage} from './OtrMessage';

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

  static mapText(payloadBundle: TextMessage | EditedTextMessage): Text {
    const {expectsReadConfirmation, legalHoldStatus, linkPreviews, mentions, quote, text} = payloadBundle.content;

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
