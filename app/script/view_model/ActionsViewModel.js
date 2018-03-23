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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};

z.viewModel.ActionsViewModel = class ActionsViewModel {
  constructor(mainViewModel, repositories) {
    this.clientRepository = repositories.client;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.ListViewModel', z.config.LOGGER.OPTIONS);
  }

  acceptConnectionRequest(userEntity, showConversation) {
    if (userEntity) {
      return this.userRepository.acceptConnectionRequest(userEntity, showConversation);
    }
  }

  archiveConversation(conversationEntity) {
    if (conversationEntity) {
      return this.conversationRepository.archive_conversation(conversationEntity);
    }
  }

  blockUser(userEntity, hideConversation, nextConversationEntity) {
    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => this.userRepository.blockUser(userEntity, hideConversation, nextConversationEntity),
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
        action: () => this.userRepository.cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity),
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
      const canLeaveConversation = conversationEntity.is_group() && !conversationEntity.removed_from_conversation();
      const modalType = canLeaveConversation
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
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.INPUT, {
      action: password => {
        this.clientRepository.deleteClient(clientEntity.id, password).catch(error => {
          amplify.subscribe(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT);
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
  }

  deleteMessage(conversationEntity, messageEntity) {
    if (conversationEntity && messageEntity) {
      return new Promise(resolve => {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
          action: () => {
            this.conversationRepository.delete_message(conversationEntity, messageEntity);
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
            this.conversationRepository.delete_message_everyone(conversationEntity, messageEntity);
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
      return this.userRepository.ignoreConnectionRequest(userEntity);
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
        .get_1to1_conversation(userEntity)
        .then(conversationEntity => this._openConversation(conversationEntity));
    }
  }

  openGroupConversation(conversationEntity) {
    if (conversationEntity) {
      return Promise.resolve().then(() => this._openConversation(conversationEntity));
    }
  }

  _openConversation(conversationEntity) {
    if (conversationEntity.is_archived()) {
      this.conversationRepository.unarchive_conversation(conversationEntity);
    }

    if (conversationEntity.is_cleared()) {
      conversationEntity.cleared_timestamp(0);
    }

    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
  }

  removeFromConversation(conversationEntity, userEntity) {
    if (conversationEntity && userEntity) {
      if (userEntity.isBot) {
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
      return this.userRepository.createConnection(userEntity, showConversation);
    }
  }

  toggleMuteConversation(conversationEntity) {
    if (conversationEntity) {
      this.conversationRepository.toggle_silence_conversation(conversationEntity);
    }
  }

  unblockUser(userEntity, showConversation) {
    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => {
          this.userRepository
            .unblockUser(userEntity, showConversation)
            .then(() => this.conversationRepository.get_1to1_conversation(userEntity))
            .then(conversationEntity => this.conversationRepository.update_participating_user_ets(conversationEntity));
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
