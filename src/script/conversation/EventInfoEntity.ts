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

import type {GenericMessage, IGenericMessage} from '@wireapp/protocol-messaging';
import type {UserClients} from '@wireapp/api-client/src/conversation/';

import type {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';

export interface MessageSendingOptions {
  /** Send native push notification for message. Default is `true`. */
  nativePush?: boolean;
  /**
   * Level that backend checks for missing clients. Default is `false`.
   *
   * Options for the precondition check on missing clients are:
   *  * `false`: all clients
   *  * `Array<string>`: only clients of listed users
   *  * `true`: force sending
   */
  precondition?: string[] | boolean;
  recipients: UserClients;
}

export class EventInfoEntity {
  options: MessageSendingOptions;
  public readonly genericMessage: GenericMessage;
  private type?: GENERIC_MESSAGE_TYPE;
  public readonly conversationId: string;
  public timestamp?: number;

  constructor(genericMessage: GenericMessage, conversationId: string = '', options?: MessageSendingOptions) {
    this.conversationId = conversationId;
    this.genericMessage = genericMessage;

    this.options = {nativePush: true, precondition: false, ...options};

    this.timestamp = undefined;
    this.type = undefined;
  }

  forceSending(): void {
    this.options.precondition = true;
  }

  getType(): GENERIC_MESSAGE_TYPE | keyof Omit<IGenericMessage, 'messageId'> | '' {
    return this.type || (this.genericMessage && this.genericMessage.content);
  }

  setTimestamp(isoDate: string): void {
    this.timestamp = new Date(isoDate).getTime();
  }

  setType(type: GENERIC_MESSAGE_TYPE): void {
    this.type = type;
  }

  updateOptions(updatedOptions: MessageSendingOptions): void {
    this.options = {...this.options, ...updatedOptions};
  }
}
