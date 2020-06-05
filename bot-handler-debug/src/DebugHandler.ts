import {MessageHandler} from '@wireapp/bot-api';
import {PayloadBundle, PayloadBundleSource, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {TextContent} from '@wireapp/core/dist/conversation/content';
import {QuotableMessage} from '@wireapp/core/dist/conversation/message/OtrMessage';

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

        switch (text) {
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
