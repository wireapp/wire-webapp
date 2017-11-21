import APIClient = require('@wireapp/api-client');
import {
  ClientMismatch,
  IncomingNotification,
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/';

export default class ConversationService {
  constructor(private apiClient: APIClient) {
  }

  public sendMessage(sendingClientId: string, conversationId: string, recipients: OTRRecipients): Promise<ClientMismatch> {
    const message: NewOTRMessage = {
      recipients,
      sender: sendingClientId,
    };
    return this.apiClient.conversation.api.postOTRMessage(sendingClientId, conversationId, message);
  }
}
