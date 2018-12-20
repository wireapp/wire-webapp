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

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};

z.viewModel.ActionsViewModel = class ActionsViewModel {
  constructor(mainViewModel, repositories) {
    this.clientRepository = repositories.client;
    this.connectionRepository = repositories.connection;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.ListViewModel', z.config.LOGGER.OPTIONS);
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
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => this.connectionRepository.blockUser(userEntity, hideConversation, nextConversationEntity),
        text: {
          action: z.l10n.text(z.string.modalUserBlockAction),
          message: z.l10n.text(z.string.modalUserBlockMessage, userEntity.first_name()),
          title: z.l10n.text(z.string.modalUserBlockHeadline, userEntity.first_name()),
        },
      });
    }
  }

  cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity) {
    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => this.connectionRepository.cancelRequest(userEntity, hideConversation, nextConversationEntity),
        text: {
          action: z.l10n.text(z.string.modalConnectCancelAction),
          message: z.l10n.text(z.string.modalConnectCancelMessage, userEntity.first_name()),
          secondary: z.l10n.text(z.string.modalConnectCancelSecondary),
          title: z.l10n.text(z.string.modalConnectCancelHeadline),
        },
      });
    }
  }

  clearConversation(conversationEntity) {
    if (conversationEntity) {
      const modalType = conversationEntity.isLeavable()
        ? z.viewModel.ModalsViewModel.TYPE.OPTION
        : z.viewModel.ModalsViewModel.TYPE.CONFIRM;

      amplify.publish(z.event.WebApp.WARNING.MODAL, modalType, {
        action: (leaveConversation = false) => {
          this.conversationRepository.clear_conversation(conversationEntity, leaveConversation);
        },
        text: {
          action: z.l10n.text(z.string.modalConversationClearAction),
          message: z.l10n.text(z.string.modalConversationClearMessage),
          option: z.l10n.text(z.string.modalConversationClearOption),
          title: z.l10n.text(z.string.modalConversationClearHeadline),
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
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.INPUT, {
        action: password => {
          this.clientRepository
            .deleteClient(clientEntity.id, password)
            .then(resolve)
            .catch(error => {
              amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
              reject(error);
            });
        },
        preventClose: true,
        text: {
          action: z.l10n.text(z.string.modalAccountRemoveDeviceAction),
          input: z.l10n.text(z.string.modalAccountRemoveDevicePlaceholder),
          message: z.l10n.text(z.string.modalAccountRemoveDeviceMessage),
          title: z.l10n.text(z.string.modalAccountRemoveDeviceHeadline, clientEntity.model),
        },
        warning: false,
      });
    });
  }

  deleteMessage(conversationEntity, messageEntity) {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
          action: () => {
            this.conversationRepository.deleteMessage(conversationEntity, messageEntity);
            resolve();
          },
          text: {
            action: z.l10n.text(z.string.modalConversationDeleteMessageAction),
            message: z.l10n.text(z.string.modalConversationDeleteMessageMessage),
            title: z.l10n.text(z.string.modalConversationDeleteMessageHeadline),
          },
        });
      });
    }
  }

  deleteMessageEveryone(conversationEntity, messageEntity) {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
          action: () => {
            this.conversationRepository.deleteMessageForEveryone(conversationEntity, messageEntity);
            resolve();
          },
          text: {
            action: z.l10n.text(z.string.modalConversationDeleteMessageEveryoneAction),
            message: z.l10n.text(z.string.modalConversationDeleteMessageEveryoneMessage),
            title: z.l10n.text(z.string.modalConversationDeleteMessageEveryoneHeadline),
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
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => this.conversationRepository.removeMember(conversationEntity, this.userRepository.self().id),
        text: {
          action: z.l10n.text(z.string.modalConversationLeaveAction),
          message: z.l10n.text(z.string.modalConversationLeaveMessage),
          title: z.l10n.text(z.string.modalConversationLeaveHeadline, conversationEntity.display_name()),
        },
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

      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
    }
  }

  removeFromConversation(conversationEntity, userEntity) {
    if (conversationEntity && userEntity) {
      if (userEntity.isService) {
        return this.integrationRepository.removeService(conversationEntity, userEntity);
      }

      return new Promise(resolve => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
          action: () => {
            this.conversationRepository.removeMember(conversationEntity, userEntity.id);
            resolve();
          },
          text: {
            action: z.l10n.text(z.string.modalConversationRemoveAction),
            message: z.l10n.text(z.string.modalConversationRemoveMessage, userEntity.first_name()),
            title: z.l10n.text(z.string.modalConversationRemoveHeadline),
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
        ? z.conversation.NotificationSetting.STATE.NOTHING
        : z.conversation.NotificationSetting.STATE.EVERYTHING;
      this.conversationRepository.setNotificationState(conversationEntity, notificationState);
    }
  }

  unblockUser(userEntity, showConversation) {
    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => {
          this.connectionRepository
            .unblockUser(userEntity, showConversation)
            .then(() => this.conversationRepository.get1To1Conversation(userEntity))
            .then(conversationEntity => {
              return this.conversationRepository.updateParticipatingUserEntities(conversationEntity);
            });
        },
        text: {
          action: z.l10n.text(z.string.modalUserUnblockAction),
          message: z.l10n.text(z.string.modalUserUnblockMessage, userEntity.first_name()),
          title: z.l10n.text(z.string.modalUserUnblockHeadline),
        },
      });
    }
  }
};
