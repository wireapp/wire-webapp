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

import {
  EditedTextContent,
  LegalHoldStatus,
  LinkPreviewUploadedContent,
  MentionContent,
  QuoteContent,
  TextContent,
} from '../content';

export class TextContentBuilder<T extends TextContent | EditedTextContent> {
  private readonly content: T;

  constructor(textContent: T) {
    this.content = textContent;
  }

  build(): T {
    return this.content;
  }

  withLinkPreviews(linkPreviews?: LinkPreviewUploadedContent[]) {
    if (linkPreviews?.length) {
      this.content.linkPreviews = linkPreviews;
    }

    return this;
  }

  withMentions(mentions?: MentionContent[]) {
    if (mentions?.length) {
      this.content.mentions = mentions;
    }

    return this;
  }

  withQuote(quote?: QuoteContent) {
    if (quote) {
      this.content.quote = quote as QuoteContent;
    }

    return this;
  }

  withReadConfirmation(expectsReadConfirmation = false) {
    if (typeof expectsReadConfirmation !== 'undefined') {
      this.content.expectsReadConfirmation = expectsReadConfirmation;
    }
    return this;
  }

  withLegalHoldStatus(legalHoldStatus = LegalHoldStatus.UNKNOWN) {
    if (typeof legalHoldStatus !== 'undefined') {
      this.content.legalHoldStatus = legalHoldStatus;
    }
    return this;
  }
}
