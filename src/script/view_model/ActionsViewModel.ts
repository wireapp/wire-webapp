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

import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import {t} from 'Util/LocalizerUtil';

import {ModalsViewModel} from './ModalsViewModel';
import {NOTIFICATION_STATE} from '../conversation/NotificationSetting';
import {BackendClientError} from '../error/BackendClientError';
import type {MainViewModel} from './MainViewModel';
import type {ClientRepository} from '../client/ClientRepository';
import type {ConnectionRepository} from '../connection/ConnectionRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {IntegrationRepository} from '../integration/IntegrationRepository';
import type {User} from '../entity/User';
import type {Conversation} from '../entity/Conversation';
import type {ClientEntity} from '../client/ClientEntity';
import type {Message} from '../entity/message/Message';
import type {ServiceEntity} from '../integration/ServiceEntity';
import type {MessageRepository} from '../conversation/MessageRepository';
import {container} from 'tsyringe';
import {UserState} from '../user/UserState';

export class ActionsViewModel {
  modalsViewModel: ModalsViewModel;

  constructor(
    mainViewModel: MainViewModel,
    private readonly clientRepository: ClientRepository,
    private readonly connectionRepository: ConnectionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.modalsViewModel = mainViewModel.modals;
  }

  acceptConnectionRequest = (userEntity: User, showConversation: boolean): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }

    return this.connectionRepository.acceptRequest(userEntity, showConversation);
  };

  archiveConversation = (conversationEntity: Conversation): Promise<void> => {
    if (!conversationEntity) {
      return Promise.reject();
    }

    return this.conversationRepository.archiveConversation(conversationEntity);
  };

  /**
   * @param userEntity User to block
   * @param hideConversation Hide current conversation
   * @param nextConversationEntity Conversation to be switched to
   * @returns Resolves when the user was blocked
   */
  blockUser = (userEntity: User, hideConversation?: boolean, nextConversationEntity?: Conversation): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }
    // TODO: Does the promise resolve when there is no primary action (i.e. cancel button gets clicked)?
    return new Promise(resolve => {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        primaryAction: {
          action: async () => {
            await this.connectionRepository.blockUser(userEntity, hideConversation, nextConversationEntity);
            resolve();
          },
          text: t('modalUserBlockAction'),
        },

        text: {
          message: t('modalUserBlockMessage', userEntity.name()),
          title: t('modalUserBlockHeadline', userEntity.name()),
        },
      });
    });
  };

  /**
   *
   * @param userEntity User to cancel the sent connection request
   * @param hideConversation Hide current conversation
   * @param nextConversationEntity Conversation to be switched to
   * @returns Resolves when the connection request was canceled
   */
  cancelConnectionRequest = (
    userEntity: User,
    hideConversation?: boolean,
    nextConversationEntity?: Conversation,
  ): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }

    return new Promise(resolve => {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        primaryAction: {
          action: () => {
            this.connectionRepository.cancelRequest(userEntity, hideConversation, nextConversationEntity);
            resolve();
          },
          text: t('modalConnectCancelAction'),
        },
        secondaryAction: {
          text: t('modalConnectCancelSecondary'),
        },
        text: {
          message: t('modalConnectCancelMessage', userEntity.name()),
          title: t('modalConnectCancelHeadline'),
        },
      });
    });
  };

  clearConversation = (conversationEntity: Conversation): void => {
    if (conversationEntity) {
      const modalType = conversationEntity.isLeavable() ? ModalsViewModel.TYPE.OPTION : ModalsViewModel.TYPE.CONFIRM;

      amplify.publish(WebAppEvents.WARNING.MODAL, modalType, {
        primaryAction: {
          action: (leaveConversation = false) => {
            this.conversationRepository.clear_conversation(conversationEntity, leaveConversation);
          },
          text: t('modalConversationClearAction'),
        },
        text: {
          message: t('modalConversationClearMessage'),
          option: t('modalConversationClearOption'),
          title: t('modalConversationClearHeadline'),
        },
      });
    }
  };

  deleteClient = (clientEntity: ClientEntity) => {
    const isSSO = this.userState.self().isSingleSignOn;
    const isTemporary = clientEntity.isTemporary();
    if (isSSO || isTemporary) {
      // Temporary clients and clients of SSO users don't require a password to be removed
      return this.clientRepository.deleteClient(clientEntity.id, undefined);
    }

    return new Promise((resolve, reject) => {
      const expectedErrors = {
        [BackendClientError.LABEL.BAD_REQUEST]: t('BackendError.LABEL.BAD_REQUEST'),
        [BackendClientError.LABEL.INVALID_CREDENTIALS]: t('BackendError.LABEL.INVALID_CREDENTIALS'),
      };
      let isSending = false;
      this.modalsViewModel.showModal(
        ModalsViewModel.TYPE.PASSWORD,
        {
          closeOnConfirm: false,
          preventClose: true,
          primaryAction: {
            action: async (password: string) => {
              if (!isSending) {
                isSending = true;
                try {
                  await this.clientRepository.deleteClient(clientEntity.id, password);
                  this.modalsViewModel.hide();
                  resolve();
                } catch (error) {
                  this.modalsViewModel.errorMessage(expectedErrors[error.label] || error.message);
                } finally {
                  isSending = false;
                }
              }
            },
            text: t('modalAccountRemoveDeviceAction'),
          },
          text: {
            input: t('modalAccountRemoveDevicePlaceholder'),
            message: t('modalAccountRemoveDeviceMessage'),
            title: t('modalAccountRemoveDeviceHeadline', clientEntity.model),
          },
        },
        undefined,
      );
    });
  };

  deleteMessage = (conversationEntity: Conversation, messageEntity: Message): Promise<void> => {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              this.messageRepository.deleteMessage(conversationEntity, messageEntity);
              resolve();
            },
            text: t('modalConversationDeleteMessageAction'),
          },
          text: {
            message: t('modalConversationDeleteMessageMessage'),
            title: t('modalConversationDeleteMessageHeadline'),
          },
        });
      });
    }

    return Promise.reject();
  };

  deleteMessageEveryone = (conversationEntity: Conversation, messageEntity: Message): Promise<void> => {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              this.messageRepository.deleteMessageForEveryone(conversationEntity, messageEntity);
              resolve();
            },
            text: t('modalConversationDeleteMessageEveryoneAction'),
          },
          text: {
            message: t('modalConversationDeleteMessageEveryoneMessage'),
            title: t('modalConversationDeleteMessageEveryoneHeadline'),
          },
        });
      });
    }

    return Promise.reject();
  };

  ignoreConnectionRequest = (userEntity: User): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }
    return this.connectionRepository.ignoreRequest(userEntity);
  };

  leaveConversation = (conversationEntity: Conversation): Promise<void> => {
    if (!conversationEntity) {
      return Promise.reject();
    }

    return new Promise(resolve => {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.OPTION, {
        primaryAction: {
          action: (clearContent = false) => {
            if (clearContent) {
              this.conversationRepository.clear_conversation(conversationEntity, true);
            } else {
              this.conversationRepository.removeMember(conversationEntity, this.userState.self().id);
            }
            resolve();
          },
          text: t('modalConversationLeaveAction'),
        },
        text: {
          message: t('modalConversationLeaveMessage'),
          option: t('modalConversationLeaveOption'),
          title: t('modalConversationLeaveHeadline', conversationEntity.display_name()),
        },
      });
    });
  };

  deleteConversation = (conversationEntity: Conversation): Promise<void> => {
    if (conversationEntity && conversationEntity.isCreatedBySelf()) {
      return new Promise(() => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              return this.conversationRepository.deleteConversation(conversationEntity);
            },
            text: t('modalConversationDeleteGroupAction'),
          },
          text: {
            message: t('modalConversationDeleteGroupMessage'),
            title: t('modalConversationDeleteGroupHeadline', conversationEntity.display_name()),
          },
        });
      });
    }

    return Promise.reject();
  };

  open1to1Conversation = (userEntity: User): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }
    return this.conversationRepository
      .get1To1Conversation(userEntity)
      .then(conversationEntity => this.openConversation(conversationEntity));
  };

  open1to1ConversationWithService = (serviceEntity: ServiceEntity): Promise<void> => {
    if (!serviceEntity) {
      return Promise.reject();
    }
    return this.integrationRepository
      .get1To1ConversationWithService(serviceEntity)
      .then(conversationEntity => this.openConversation(conversationEntity));
  };

  openGroupConversation = (conversationEntity?: Conversation): Promise<void> => {
    if (!conversationEntity) {
      return Promise.reject();
    }
    return Promise.resolve().then(() => this.openConversation(conversationEntity));
  };

  private readonly openConversation = (conversationEntity?: Conversation): void => {
    if (conversationEntity) {
      if (conversationEntity.is_archived()) {
        this.conversationRepository.unarchiveConversation(conversationEntity, true);
      }

      if (conversationEntity.is_cleared()) {
        conversationEntity.cleared_timestamp(0);
      }

      amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
    }
  };

  removeFromConversation = async (conversationEntity: Conversation, userEntity: User): Promise<void> => {
    if (conversationEntity && userEntity) {
      if (userEntity.isService) {
        await this.integrationRepository.removeService(conversationEntity, userEntity);
        return;
      }

      return new Promise((resolve, reject) => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: async () => {
              try {
                await this.conversationRepository.removeMember(conversationEntity, userEntity.id);
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            text: t('modalConversationRemoveAction'),
          },
          text: {
            message: t('modalConversationRemoveMessage', userEntity.name()),
            title: t('modalConversationRemoveHeadline'),
          },
        });
      });
    }

    throw new Error(`Unable to remove user '${userEntity?.id}' from conversation '${conversationEntity?.id}'`);
  };

  /**
   * @param userEntity User to connect to
   * @param showConversation Should we open the new conversation?
   * @returns Resolves when the connection request was successfully created
   */
  sendConnectionRequest = (userEntity: User, showConversation?: boolean): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }
    return this.connectionRepository.createConnection(userEntity, showConversation);
  };

  toggleMuteConversation = (conversationEntity: Conversation): void => {
    if (conversationEntity) {
      const notificationState = conversationEntity.showNotificationsEverything()
        ? NOTIFICATION_STATE.NOTHING
        : NOTIFICATION_STATE.EVERYTHING;
      this.conversationRepository.setNotificationState(conversationEntity, notificationState);
    }
  };

  /**
   * @param userEntity User to unblock
   * @param showConversation Show new conversation on success
   * @returns Resolves when the user was unblocked
   */
  unblockUser = (userEntity: User, showConversation?: boolean): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }

    return new Promise(resolve => {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        primaryAction: {
          action: () => {
            this.connectionRepository
              .unblockUser(userEntity, showConversation)
              .then(() => this.conversationRepository.get1To1Conversation(userEntity))
              .then(conversationEntity => {
                resolve();
                return this.conversationRepository.updateParticipatingUserEntities(conversationEntity);
              });
          },
          text: t('modalUserUnblockAction'),
        },
        text: {
          message: t('modalUserUnblockMessage', userEntity.name()),
          title: t('modalUserUnblockHeadline'),
        },
      });
    });
  };
}
