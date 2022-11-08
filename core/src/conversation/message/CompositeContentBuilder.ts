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

import {Button, Composite, Text} from '@wireapp/protocol-messaging';

import {createId} from './MessageBuilder';
import {CompositeMessage} from './OtrMessage';

import {CompositeContent, LegalHoldStatus} from '../content';

export class CompositeContentBuilder {
  private readonly content: CompositeContent = {};
  private readonly payloadBundle: CompositeMessage;
  private readonly items: Composite.IItem[] = [];

  constructor(payloadBundle: CompositeMessage) {
    this.payloadBundle = payloadBundle;
  }

  build(): CompositeMessage {
    this.payloadBundle.content = this.content;
    this.payloadBundle.content.items = this.items;
    return this.payloadBundle;
  }

  withReadConfirmation(expectsReadConfirmation: boolean = false): CompositeContentBuilder {
    this.content.expectsReadConfirmation = expectsReadConfirmation;
    return this;
  }

  withLegalHoldStatus(legalHoldStatus: LegalHoldStatus = LegalHoldStatus.UNKNOWN): CompositeContentBuilder {
    this.content.legalHoldStatus = legalHoldStatus;
    return this;
  }

  addText(text: Text): CompositeContentBuilder {
    this.items.push(Composite.Item.create({text}));
    return this;
  }

  addButton(buttonText: string, id: string = createId()): CompositeContentBuilder {
    this.items.push(Composite.Item.create({button: Button.create({id, text: buttonText})}));
    return this;
  }
}
