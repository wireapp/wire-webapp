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

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';

import {ModalsViewModel} from './ModalsViewModel';
import {NOTIFICATION_STATE} from '../conversation/NotificationSetting';
import {WebAppEvents} from '../event/WebApp';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};

z.viewModel.ActionsViewModel = class ActionsViewModel {
  constructor(mainViewModel, repositories) {
    this.clientRepository = repositories.client;
    this.connectionRepository = repositories.connection;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.userRepository = repositories.user;
    this.logger = getLogger('z.viewModel.ListViewModel');
  }

  acceptConnectionRequest(userEntity, showConversation) {
    if (userEntity) {
      return this.connectionRepository.acceptRequest(userEntity, showConversation);
    }
  }

  archiveConversation(conversationEntity) {
    if (conversationEntity) {
      return this.conversationRepository.archiveConversation(conversationEntity);
    }
  }

  blockUser(userEntity, hideConversation, nextConversationEntity) {
    if (userEntity) {
      return new Promise(resolve => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              this.connectionRepository.blockUser(userEntity, hideConversation, nextConversationEntity);
              resolve();
            },
            text: t('modalUserBlockAction'),
          },

          text: {
            message: t('modalUserBlockMessage', userEntity.first_name()),
            title: t('modalUserBlockHeadline', userEntity.first_name()),
          },
        });
      });
    }
  }

  cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity) {
    if (userEntity) {
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
            message: t('modalConnectCancelMessage', userEntity.first_name()),
            title: t('modalConnectCancelHeadline'),
          },
        });
      });
    }
  }

  clearConversation(conversationEntity) {
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
  }

  deleteClient(clientEntity) {
    // @todo Add failure case ux WEBAPP-3570
    if (this.userRepository.self().isSingleSignOn) {
      // SSO users can remove their clients without the need of entering a password
      return this.clientRepository.deleteClient(clientEntity.id);
    }

    return new Promise((resolve, reject) => {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.INPUT, {
        preventClose: true,
        primaryAction: {
          action: password => {
            this.clientRepository
              .deleteClient(clientEntity.id, password)
              .then(resolve)
              .catch(error => {
                reject(error);
              });
          },
          text: t('modalAccountRemoveDeviceAction'),
        },
        text: {
          input: t('modalAccountRemoveDevicePlaceholder'),
          message: t('modalAccountRemoveDeviceMessage'),
          title: t('modalAccountRemoveDeviceHeadline', clientEntity.model),
        },
      });
    });
  }

  deleteMessage(conversationEntity, messageEntity) {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              this.conversationRepository.deleteMessage(conversationEntity, messageEntity);
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
  }

  deleteMessageEveryone(conversationEntity, messageEntity) {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              this.conversationRepository.deleteMessageForEveryone(conversationEntity, messageEntity);
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
  }

  ignoreConnectionRequest(userEntity) {
    if (userEntity) {
      return this.connectionRepository.ignoreRequest(userEntity);
    }
  }

  leaveConversation(conversationEntity) {
    if (conversationEntity) {
      return new Promise(resolve => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              this.conversationRepository.removeMember(conversationEntity, this.userRepository.self().id);
              resolve();
            },
            text: t('modalConversationLeaveAction'),
          },
          text: {
            message: t('modalConversationLeaveMessage'),
            title: t('modalConversationLeaveHeadline', conversationEntity.display_name()),
          },
        });
      });
    }
  }

  open1to1Conversation(userEntity) {
    if (userEntity) {
      return this.conversationRepository
        .get1To1Conversation(userEntity)
        .then(conversationEntity => this._openConversation(conversationEntity));
    }
  }

  open1to1ConversationWithService(serviceEntity) {
    if (serviceEntity) {
      return this.integrationRepository
        .get1To1ConversationWithService(serviceEntity)
        .then(conversationEntity => this._openConversation(conversationEntity));
    }
  }

  openGroupConversation(conversationEntity) {
    if (conversationEntity) {
      return Promise.resolve().then(() => this._openConversation(conversationEntity));
    }
  }

  _openConversation(conversationEntity) {
    if (conversationEntity) {
      if (conversationEntity.is_archived()) {
        this.conversationRepository.unarchiveConversation(conversationEntity, true);
      }

      if (conversationEntity.is_cleared()) {
        conversationEntity.cleared_timestamp(0);
      }

      amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
    }
  }

  removeFromConversation(conversationEntity, userEntity) {
    if (conversationEntity && userEntity) {
      if (userEntity.isService) {
        return this.integrationRepository.removeService(conversationEntity, userEntity);
      }

      return new Promise(resolve => {
        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          primaryAction: {
            action: () => {
              this.conversationRepository.removeMember(conversationEntity, userEntity.id);
              resolve();
            },
            text: t('modalConversationRemoveAction'),
          },
          text: {
            message: t('modalConversationRemoveMessage', userEntity.first_name()),
            title: t('modalConversationRemoveHeadline'),
          },
        });
      });
    }
  }

  sendConnectionRequest(userEntity, showConversation) {
    if (userEntity) {
      return this.connectionRepository.createConnection(userEntity, showConversation);
    }
  }

  toggleMuteConversation(conversationEntity) {
    if (conversationEntity) {
      const notificationState = conversationEntity.showNotificationsEverything()
        ? NOTIFICATION_STATE.NOTHING
        : NOTIFICATION_STATE.EVERYTHING;
      this.conversationRepository.setNotificationState(conversationEntity, notificationState);
    }
  }

  unblockUser(userEntity, showConversation) {
    if (userEntity) {
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
            message: t('modalUserUnblockMessage', userEntity.first_name()),
            title: t('modalUserUnblockHeadline'),
          },
        });
      });
    }
  }
};
