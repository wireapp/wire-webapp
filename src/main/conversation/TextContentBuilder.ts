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

import {PayloadBundleOutgoingUnsent} from '../conversation/';
import {LinkPreviewUploadedContent, MentionContent, QuoteContent, TextContent} from '../conversation/content/';

class TextContentBuilder {
  private readonly content: TextContent;
  private readonly payloadBundle: PayloadBundleOutgoingUnsent;

  constructor(payloadBundle: PayloadBundleOutgoingUnsent) {
    this.payloadBundle = payloadBundle;
    this.content = this.payloadBundle.content as TextContent;
  }

  public build(): PayloadBundleOutgoingUnsent {
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

  public withQuote(quote?: QuoteContent): TextContentBuilder {
    if (quote) {
      this.content.quote = quote;
    }

    return this;
  }

  public withReadConfirmation(expectsReadConfirmation = true): TextContentBuilder {
    this.content.expectsReadConfirmation = expectsReadConfirmation;

    return this;
  }
}

export {TextContentBuilder};
