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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {QualifiedId} from '@wireapp/api-client/lib/user/';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal, removeCurrentModal, usePrimaryModalState} from 'Components/Modals/PrimaryModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import type {ClientEntity} from 'Repositories/client';
import type {ConnectionRepository} from 'Repositories/connection/ConnectionRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {NOTIFICATION_STATE} from 'Repositories/conversation/NotificationSetting';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {Message} from 'Repositories/entity/message/Message';
import type {User} from 'Repositories/entity/User';
import type {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import type {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {SelfRepository} from 'Repositories/self/SelfRepository';
import {UserState} from 'Repositories/user/UserState';
import {t} from 'Util/LocalizerUtil';
import {isBackendError} from 'Util/TypePredicateUtil';

import type {MainViewModel} from './MainViewModel';

export class ActionsViewModel {
  constructor(
    private readonly selfRepository: SelfRepository,
    private readonly cellsRepository: CellsRepository,
    private readonly connectionRepository: ConnectionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly userState = container.resolve(UserState),
    private readonly mainViewModel: MainViewModel,
  ) {}

  readonly acceptConnectionRequest = (userEntity: User): Promise<void> => {
    return this.connectionRepository.acceptRequest(userEntity);
  };

  readonly archiveConversation = (conversationEntity: Conversation): Promise<void> => {
    if (!conversationEntity) {
      return Promise.reject();
    }

    return this.conversationRepository.archiveConversation(conversationEntity);
  };

  readonly unarchiveConversation = (conversationEntity: Conversation): void => {
    if (!conversationEntity) {
      return;
    }

    return this.mainViewModel.list.clickToUnarchive(conversationEntity);
  };

  /**
   * @param userEntity User to block
   * @returns Resolves when the user was blocked
   */
  readonly blockUser = (userEntity: User): Promise<void> => {
    // TODO: Does the promise resolve when there is no primary action (i.e. cancel button gets clicked)?
    return new Promise(resolve => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: async () => {
            await this.connectionRepository.blockUser(userEntity);
            resolve();
          },
          text: t('modalUserBlockAction'),
        },

        text: {
          message: t('modalUserBlockMessage', {user: userEntity.name()}),
          title: t('modalUserBlockHeadline', {user: userEntity.name()}),
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
  readonly cancelConnectionRequest = (
    userEntity: User,
    hideConversation?: boolean,
    nextConversationEntity?: Conversation,
  ): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }

    return new Promise(resolve => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: async () => {
            await this.connectionRepository.cancelRequest(userEntity, hideConversation, nextConversationEntity);
            resolve();
          },
          text: t('modalConnectCancelAction'),
        },
        secondaryAction: {
          text: t('modalConnectCancelSecondary'),
        },
        text: {
          message: t('modalConnectCancelMessage', {user: userEntity.name()}, {}, true),
          title: t('modalConnectCancelHeadline'),
        },
      });
    });
  };

  private readonly leaveOrClearConversation = async (
    conversation: Conversation,
    {leave, clear}: {leave: boolean; clear: boolean},
  ): Promise<void> => {
    if (leave) {
      await this.conversationRepository.leaveConversation(conversation);
    }
    if (clear) {
      await this.conversationRepository.clearConversation(conversation);
    }
  };

  readonly clearConversation = (conversationEntity: Conversation): void => {
    if (conversationEntity) {
      const modalType = conversationEntity.isLeavable() ? PrimaryModal.type.OPTION : PrimaryModal.type.CONFIRM;

      PrimaryModal.show(modalType, {
        primaryAction: {
          action: async (leave = false) => {
            await this.leaveOrClearConversation(conversationEntity, {clear: true, leave: leave});
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

  readonly deleteClient = (clientEntity: ClientEntity) => {
    const isSSO = this.userState.self().isNoPasswordSSO;
    const isTemporary = clientEntity.isTemporary();
    if (isSSO || isTemporary) {
      // Temporary clients and clients of SSO users don't require a password to be removed
      return this.selfRepository.deleteSelfUserClient(clientEntity.id, undefined);
    }

    return new Promise<void>(resolve => {
      const expectedErrors = {
        [BackendErrorLabel.BAD_REQUEST]: t('BackendError.LABEL.BAD_REQUEST'),
        [BackendErrorLabel.INVALID_CREDENTIALS]: t('BackendError.LABEL.INVALID_CREDENTIALS'),
      };
      let isSending = false;
      PrimaryModal.show(
        PrimaryModal.type.PASSWORD,
        {
          closeOnConfirm: false,
          preventClose: true,
          primaryAction: {
            action: async (password: string) => {
              if (!isSending) {
                isSending = true;
                try {
                  await this.selfRepository.deleteSelfUserClient(clientEntity.id, password);
                  removeCurrentModal();
                  resolve();
                } catch (error) {
                  if (isBackendError(error)) {
                    const {updateErrorMessage} = usePrimaryModalState.getState();
                    if (
                      error.label === BackendErrorLabel.BAD_REQUEST ||
                      error.label === BackendErrorLabel.INVALID_CREDENTIALS
                    ) {
                      updateErrorMessage(expectedErrors[error.label]);
                    } else {
                      updateErrorMessage(error.message);
                    }
                  }
                } finally {
                  isSending = false;
                }
              }
            },
            text: t('modalAccountRemoveDeviceAction'),
          },
          text: {
            closeBtnLabel: t('modalRemoveDeviceCloseBtn', {name: clientEntity.model as string}),
            input: t('modalAccountRemoveDevicePlaceholder'),
            message: t('modalAccountRemoveDeviceMessage'),
            title: t('modalAccountRemoveDeviceHeadline', {device: clientEntity.model as string}),
          },
        },
        undefined,
      );
    });
  };

  readonly deleteMessage = (conversationEntity: Conversation, messageEntity: Message): Promise<void> => {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        PrimaryModal.show(PrimaryModal.type.CONFIRM, {
          primaryAction: {
            action: async () => {
              await this.messageRepository.deleteMessage(conversationEntity, messageEntity);
              resolve();
            },
            text: t('modalConversationDeleteMessageAction'),
          },
          text: {
            closeBtnLabel: t('modalConversationDeleteMessageCloseBtn'),
            message: t('modalConversationDeleteMessageMessage'),
            title: t('modalConversationDeleteMessageHeadline'),
          },
        });
      });
    }

    return Promise.reject();
  };

  readonly deleteMessageEveryone = (conversationEntity: Conversation, messageEntity: Message): Promise<void> => {
    if (conversationEntity && messageEntity) {
      const cellsAssets = this.messageRepository.getCellsAssetAttachmentIds(messageEntity);

      const deleteMessage = async () => {
        if (cellsAssets.length > 0) {
          await this.cellsRepository.deleteNodes({uuids: cellsAssets, permanently: true});
        }
        await this.messageRepository.deleteMessageForEveryone(conversationEntity, messageEntity);
      };

      return new Promise(resolve => {
        PrimaryModal.show(PrimaryModal.type.CONFIRM, {
          primaryAction: {
            action: async () => {
              await deleteMessage();
              resolve();
            },
            text: t('modalConversationDeleteMessageEveryoneAction'),
          },
          text: {
            closeBtnLabel: t('modalConversationDeleteMessageAllCloseBtn'),
            message: t('modalConversationDeleteMessageEveryoneMessage'),
            title: t('modalConversationDeleteMessageEveryoneHeadline'),
          },
        });
      });
    }

    return Promise.reject();
  };

  readonly ignoreConnectionRequest = (userEntity: User): Promise<void> => {
    if (!userEntity) {
      return Promise.reject();
    }
    return this.connectionRepository.ignoreRequest(userEntity);
  };

  readonly leaveConversation = (conversation: Conversation): Promise<void> => {
    if (!conversation) {
      return Promise.reject();
    }

    return new Promise(resolve => {
      PrimaryModal.show(PrimaryModal.type.OPTION, {
        primaryAction: {
          action: async (clearContent = false) => {
            await this.leaveOrClearConversation(conversation, {clear: clearContent, leave: true});
            resolve();
          },
          text: t('modalConversationLeaveAction'),
        },
        text: {
          closeBtnLabel: t('modalConversationLeaveMessageCloseBtn', {name: conversation.display_name()}),
          message: t('modalConversationLeaveMessage'),
          option: t('modalConversationLeaveOption'),
          title: t('modalConversationLeaveHeadline', {name: conversation.display_name()}),
        },
      });
    });
  };

  readonly deleteConversation = (conversationEntity: Conversation) => {
    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      primaryAction: {
        action: () => this.conversationRepository.deleteConversation(conversationEntity),
        text: t('modalConversationDeleteGroupAction'),
      },
      text: {
        message: t('modalConversationDeleteGroupMessage'),
        title: conversationEntity.isChannel()
          ? t('modalChannelDeleteGroupHeadline')
          : t('modalGroupDeleteGroupHeadline'),
      },
    });
  };

  readonly removeConversation = (conversationEntity: Conversation) => {
    if (!conversationEntity.isGroupOrChannel() || !conversationEntity.isSelfUserRemoved()) {
      return;
    }

    PrimaryModal.show(PrimaryModal.type.CONFIRM, {
      primaryAction: {
        action: () => this.conversationRepository.deleteConversationLocally(conversationEntity, true),
        text: t('modalConversationRemoveGroupAction'),
      },
      text: {
        message: t('modalConversationRemoveGroupMessage'),
        title: t('modalConversationRemoveGroupHeadline', {conversation: conversationEntity.display_name()}),
      },
    });
  };

  getConversationById = async (conversation: QualifiedId): Promise<Conversation> => {
    return this.conversationRepository.getConversationById(conversation);
  };

  saveConversation = async (conversation: Conversation): Promise<Conversation> => {
    return this.conversationRepository.saveConversation(conversation);
  };

  getOrCreate1to1Conversation = async (userEntity: User): Promise<Conversation> => {
    const conversationEntity = await this.conversationRepository.resolve1To1Conversation(userEntity.qualifiedId, {
      mls: {allowUnestablished: false},
    });
    if (conversationEntity) {
      return conversationEntity;
    }
    throw new Error(`Cannot find or create 1:1 conversation with user ID "${userEntity.id}".`);
  };

  open1to1Conversation = (conversationEntity: Conversation): Promise<void> => {
    return this.openConversation(conversationEntity);
  };

  readonly open1to1ConversationWithService = async (serviceEntity: ServiceEntity): Promise<void> => {
    if (!serviceEntity) {
      throw new Error();
    }
    const conversationEntity = await this.integrationRepository.get1To1ConversationWithService(serviceEntity);
    return this.openConversation(conversationEntity);
  };

  readonly openGroupConversation = async (conversationEntity?: Conversation): Promise<void> => {
    if (!conversationEntity) {
      throw new Error();
    }
    return this.openConversation(conversationEntity);
  };

  private readonly openConversation = async (conversationEntity: Conversation): Promise<void> => {
    if (conversationEntity.is_cleared()) {
      conversationEntity.cleared_timestamp(0);
    }

    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {});
  };

  removeFromConversation = async (conversationEntity: Conversation, userEntity: User): Promise<void> => {
    if (conversationEntity && userEntity) {
      if (userEntity.isService) {
        await this.integrationRepository.removeService(conversationEntity, userEntity);
        return;
      }

      return new Promise((resolve, reject) => {
        PrimaryModal.show(PrimaryModal.type.CONFIRM, {
          primaryAction: {
            action: async () => {
              try {
                await this.conversationRepository.removeMembers(conversationEntity, [userEntity.qualifiedId]);
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            text: t('modalConversationRemoveAction'),
          },
          text: {
            closeBtnLabel: t('modalConversationRemoveCloseBtn'),
            message: t('modalConversationRemoveMessage', {user: userEntity.name()}),
            title: t('modalConversationRemoveHeadline'),
          },
        });
      });
    }

    throw new Error(`Unable to remove user '${userEntity?.id}' from conversation '${conversationEntity?.id}'`);
  };

  /**
   * @param userEntity User to connect to
   * @returns Promise that resolves to true if the request was successfully sent, false if not
   */
  readonly sendConnectionRequest = (
    userEntity: User,
  ): Promise<{connectionStatus: ConnectionStatus; conversationId: QualifiedId} | null> => {
    return this.connectionRepository.createConnection(userEntity);
  };

  readonly toggleMuteConversation = async (conversationEntity: Conversation): Promise<void> => {
    if (conversationEntity) {
      const notificationState = conversationEntity.showNotificationsEverything()
        ? NOTIFICATION_STATE.NOTHING
        : NOTIFICATION_STATE.EVERYTHING;
      await this.conversationRepository.setNotificationState(conversationEntity, notificationState);
    }
  };

  /**
   * @param userEntity User to unblock
   * @returns Resolves when the user was unblocked
   */
  readonly unblockUser = (userEntity: User): Promise<void> => {
    return new Promise(resolve => {
      PrimaryModal.show(PrimaryModal.type.CONFIRM, {
        primaryAction: {
          action: async () => {
            await this.connectionRepository.unblockUser(userEntity);
            const conversationEntity = await this.conversationRepository.resolve1To1Conversation(
              userEntity.qualifiedId,
            );
            resolve();
            if (conversationEntity) {
              await this.conversationRepository.updateParticipatingUserEntities(conversationEntity);
            }
          },
          text: t('modalUserUnblockAction'),
        },
        text: {
          message: t('modalUserUnblockMessage', {user: userEntity.name()}),
          title: t('modalUserUnblockHeadline'),
        },
      });
    });
  };
}
