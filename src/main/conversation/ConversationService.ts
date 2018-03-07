const UUID = require('pure-uuid');
import APIClient = require('@wireapp/api-client');
import {AxiosError} from 'axios';
import {
  ClientMismatch,
  NewOTRMessage,
  OTRRecipients,
  UserClients,
} from '@wireapp/api-client/dist/commonjs/conversation/index';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/index';
import {CryptographyService} from '../crypto/root';

export default class ConversationService {
  private clientID: string = '';

  constructor(
    private apiClient: APIClient,
    private protocolBuffers: any = {},
    private cryptographyService: CryptographyService
  ) {}

  public sendMessage(
    sendingClientId: string,
    conversationId: string,
    recipients: OTRRecipients
  ): Promise<ClientMismatch> {
    const message: NewOTRMessage = {
      recipients,
      sender: sendingClientId,
    };
    return this.apiClient.conversation.api.postOTRMessage(sendingClientId, conversationId, message);
  }

  // TODO: The correct functionality of this function is heavily based on the case that it always runs into the catch block
  private getPreKeyBundles(conversationId: string): Promise<ClientMismatch | UserPreKeyBundleMap> {
    return this.apiClient.conversation.api.postOTRMessage(this.clientID, conversationId).catch((error: AxiosError) => {
      if (error.response && error.response.status === 412) {
        const recipients: UserClients = error.response.data.missing;
        return this.apiClient.user.api.postMultiPreKeyBundles(recipients);
      }
      throw error;
    });
  }

  public sendTextMessage(conversationId: string, message: string): Promise<ClientMismatch> {
    const customTextMessage = this.protocolBuffers.GenericMessage.create({
      messageId: new UUID(4).format(),
      text: this.protocolBuffers.Text.create({content: message}),
    });

    return this.getPreKeyBundles(conversationId)
      .then((preKeyBundles: ClientMismatch | UserPreKeyBundleMap) => {
        const typedArray = this.protocolBuffers.GenericMessage.encode(customTextMessage).finish();
        return this.cryptographyService.encrypt(typedArray, <UserPreKeyBundleMap>preKeyBundles);
      })
      .then((payload: OTRRecipients) => this.sendMessage(this.clientID, conversationId, payload));
  }

  public setClientID(clientID: string) {
    this.clientID = clientID;
  }
}
