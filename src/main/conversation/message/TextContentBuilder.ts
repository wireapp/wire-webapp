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

import {MessageHashService} from '../../cryptography';
import {
  LegalHoldStatus,
  LinkPreviewUploadedContent,
  MentionContent,
  QuoteContent,
  QuoteMessageContent,
  TextContent,
} from '../content';
import {EditedTextMessage, TextMessage} from './OtrMessage';

export class TextContentBuilder {
  private readonly content: TextContent;
  private readonly payloadBundle: TextMessage | EditedTextMessage;

  constructor(payloadBundle: TextMessage | EditedTextMessage) {
    this.payloadBundle = payloadBundle;
    this.content = this.payloadBundle.content as TextContent;
  }

  public build(): TextMessage | EditedTextMessage {
    this.payloadBundle.content = this.content;
    return this.payloadBundle;
  }

  public withLinkPreviews(linkPreviews?: LinkPreviewUploadedContent[]): TextContentBuilder {
    if (linkPreviews && linkPreviews.length) {
      this.content.linkPreviews = linkPreviews;
    }

    return this;
  }

  public withMentions(mentions?: MentionContent[]): TextContentBuilder {
    if (mentions && mentions.length) {
      this.content.mentions = mentions;
    }

    return this;
  }

  public withQuote(quote: QuoteMessageContent, timestamp: number): TextContentBuilder;
  public withQuote(quote?: QuoteContent): TextContentBuilder;
  public withQuote(quote?: QuoteContent | QuoteMessageContent, timestamp?: number): TextContentBuilder {
    if (quote) {
      if (timestamp) {
        const messageHashService = new MessageHashService((quote as QuoteMessageContent).content, timestamp);
        const messageHashBuffer = messageHashService.getHash();

        this.content.quote = {
          quotedMessageId: quote.quotedMessageId,
          quotedMessageSha256: new Uint8Array(messageHashBuffer),
        };
      } else {
        this.content.quote = quote as QuoteContent;
      }
    }

    return this;
  }

  public withReadConfirmation(expectsReadConfirmation = false): TextContentBuilder {
    if (typeof expectsReadConfirmation !== 'undefined') {
      this.content.expectsReadConfirmation = expectsReadConfirmation;
    }
    return this;
  }

  public withLegalHoldStatus(legalHoldStatus = LegalHoldStatus.UNKNOWN): TextContentBuilder {
    if (typeof legalHoldStatus !== 'undefined') {
      this.content.legalHoldStatus = legalHoldStatus;
    }
    return this;
  }
}
