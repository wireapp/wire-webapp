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

import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleSource, PayloadBundleType} from '@wireapp/core/src/main/conversation/';
import {TextContent} from '@wireapp/core/src/main/conversation/content';
import {QuotableMessage} from '@wireapp/core/src/main/conversation/message/OtrMessage';

export class DebugHandler extends MessageHandler {
  async handleEvent(payload: PayloadBundle): Promise<void> {
    if (payload.source === PayloadBundleSource.NOTIFICATION_STREAM) {
      return;
    }
    switch (payload.type) {
      case PayloadBundleType.TEXT:
        const text = (payload.content as TextContent).text;
        const quotedMessage = payload as QuotableMessage;
        const conversationId = payload.conversation;

        switch (text.trim()) {
          case '/conversation':
            const conversationText = `The ID of this conversation is "${payload.conversation}".`;
            await this.sendText(conversationId, conversationText);
            break;
          case '/my-client':
            const myClientIdText = `Your client ID is "${payload.fromClientId}".`;
            await this.sendReply(conversationId, quotedMessage, myClientIdText);
            break;
          case '/my-user':
            const myUserIdText = `Your user ID is "${payload.from}".`;
            await this.sendReply(conversationId, quotedMessage, myUserIdText);
            break;
          case '/your-client':
            if (this.account) {
              const yourClientIdText = `My client ID is "${this.account.clientId}".`;
              await this.sendText(conversationId, yourClientIdText);
            }
            break;
          case '/your-user':
            if (this.account) {
              const yourUserIdText = `My user ID is "${this.account.userId}".`;
              await this.sendText(conversationId, yourUserIdText);
            }
            break;
        }
        break;
    }
  }
}
