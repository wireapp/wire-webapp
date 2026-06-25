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

import is from '@sindresorhus/is';
import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {DefaultConversationRoleName} from '@wireapp/api-client/lib/conversation';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {FEATURE_KEY, FEATURE_STATUS} from '@wireapp/api-client/lib/team';
import {UserType, QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {useLeaveGroupAdminModalStore} from 'Components/modals/leaveGroupAdminModal/useLeaveGroupAdminModalStore';
import {PrimaryModal, removeCurrentModal, usePrimaryModalState} from 'Components/modals/primaryModal';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import type {ClientEntity} from 'Repositories/client';
import type {ConnectionRepository} from 'Repositories/connection/connectionRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {NOTIFICATION_STATE} from 'Repositories/conversation/NotificationSetting';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {Message} from 'Repositories/entity/message/message';
import type {User} from 'Repositories/entity/User';
import type {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import type {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {SelfRepository} from 'Repositories/self/SelfRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/userState';
import {type Translate} from 'Util/localizerUtil';
import {isBackendError} from 'Util/typePredicateUtil';

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
    private readonly teamState = container.resolve(TeamState),
    private readonly mainViewModel: MainViewModel,
    private readonly translate: Translate,
  ) {}

  readonly acceptConnectionRequest = (userEntity: User): Promise<void> => {
    return this.connectionRepository.acceptRequest(userEntity);
  };

  readonly archiveConversation = (conversationEntity?: Conversation): Promise<void> => {
    if (conversationEntity === undefined) {
      return Promise.reject();
    }

    return this.conversationRepository.archiveConversation(conversationEntity);
  };

  readonly unarchiveConversation = (conversationEntity?: Conversation): void => {
    if (conversationEntity === undefined) {
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
      PrimaryModal.show(
        PrimaryModal.type.CONFIRM,
        {
          primaryAction: {
            action: async () => {
              await this.connectionRepository.blockUser(userEntity);
              resolve();
            },
            text: this.translate('modalUserBlockAction'),
          },

          text: {
            message: this.translate('modalUserBlockMessage', {user: userEntity.name()}),
            title: this.translate('modalUserBlockHeadline', {user: userEntity.name()}),
          },
        },
        undefined,
        this.translate,
      );
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
    userEntity?: User,
    hideConversation?: boolean,
    nextConversationEntity?: Conversation,
  ): Promise<void> => {
    if (userEntity === undefined) {
      return Promise.reject();
    }

    return new Promise(resolve => {
      PrimaryModal.show(
        PrimaryModal.type.CONFIRM,
        {
          primaryAction: {
            action: async () => {
              await this.connectionRepository.cancelRequest(userEntity, hideConversation, nextConversationEntity);
              resolve();
            },
            text: this.translate('modalConnectCancelAction'),
          },
          secondaryAction: {
            text: this.translate('modalConnectCancelSecondary'),
          },
          text: {
            message: this.translate('modalConnectCancelMessage', {user: userEntity.name()}, {}, true),
            title: this.translate('modalConnectCancelHeadline'),
          },
        },
        undefined,
        this.translate,
      );
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

  readonly clearConversation = (conversationEntity?: Conversation): void => {
    if (conversationEntity !== undefined) {
      const modalType = conversationEntity.isLeavable() ? PrimaryModal.type.OPTION : PrimaryModal.type.CONFIRM;

      PrimaryModal.show(
        modalType,
        {
          primaryAction: {
            action: async (leave = false) => {
              await this.leaveOrClearConversation(conversationEntity, {clear: true, leave: leave});
            },
            text: this.translate('modalConversationClearAction'),
          },
          text: {
            message: this.translate('modalConversationClearMessage'),
            option: this.translate('modalConversationClearOption'),
            title: this.translate('modalConversationClearHeadline'),
          },
        },
        undefined,
        this.translate,
      );
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
        [BackendErrorLabel.BAD_REQUEST]: this.translate('BackendError.LABEL.BAD_REQUEST'),
        [BackendErrorLabel.INVALID_CREDENTIALS]: this.translate('BackendError.LABEL.INVALID_CREDENTIALS'),
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
                } catch (error: unknown) {
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
            text: this.translate('modalAccountRemoveDeviceAction'),
          },
          text: {
            closeBtnLabel: this.translate('modalRemoveDeviceCloseBtn', {name: clientEntity.model as string}),
            input: this.translate('modalAccountRemoveDevicePlaceholder'),
            message: this.translate('modalAccountRemoveDeviceMessage'),
            title: this.translate('modalAccountRemoveDeviceHeadline', {device: clientEntity.model as string}),
          },
        },
        undefined,
        this.translate,
      );
    });
  };

  readonly deleteMessage = (conversationEntity?: Conversation, messageEntity?: Message): Promise<void> => {
    if (conversationEntity !== undefined && messageEntity !== undefined) {
      return new Promise(resolve => {
        PrimaryModal.show(
          PrimaryModal.type.CONFIRM,
          {
            primaryAction: {
              action: async () => {
                await this.messageRepository.deleteMessage(conversationEntity, messageEntity);
                resolve();
              },
              text: this.translate('modalConversationDeleteMessageAction'),
            },
            text: {
              closeBtnLabel: this.translate('modalConversationDeleteMessageCloseBtn'),
              message: this.translate('modalConversationDeleteMessageMessage'),
              title: this.translate('modalConversationDeleteMessageHeadline'),
            },
          },
          undefined,
          this.translate,
        );
      });
    }

    return Promise.reject();
  };

  readonly deleteMessageEveryone = (conversationEntity?: Conversation, messageEntity?: Message): Promise<void> => {
    if (conversationEntity !== undefined && messageEntity !== undefined) {
      const cellsAssets = this.messageRepository.getCellsAssetAttachmentIds(messageEntity);

      const deleteMessage = async () => {
        if (cellsAssets.length > 0) {
          await this.cellsRepository.deleteNodes({uuids: cellsAssets, permanently: true});
        }
        await this.messageRepository.deleteMessageForEveryone(conversationEntity, messageEntity);
      };

      return new Promise(resolve => {
        PrimaryModal.show(
          PrimaryModal.type.CONFIRM,
          {
            primaryAction: {
              action: async () => {
                await deleteMessage();
                resolve();
              },
              text: this.translate('modalConversationDeleteMessageEveryoneAction'),
            },
            text: {
              closeBtnLabel: this.translate('modalConversationDeleteMessageAllCloseBtn'),
              message: this.translate('modalConversationDeleteMessageEveryoneMessage'),
              title: this.translate('modalConversationDeleteMessageEveryoneHeadline'),
            },
          },
          undefined,
          this.translate,
        );
      });
    }

    return Promise.reject();
  };

  readonly ignoreConnectionRequest = (userEntity?: User): Promise<void> => {
    if (userEntity === undefined) {
      return Promise.reject();
    }
    return this.connectionRepository.ignoreRequest(userEntity);
  };

  readonly leaveConversation = (conversation?: Conversation): Promise<void> => {
    if (conversation === undefined) {
      return Promise.reject();
    }

    if (is.emptyArray(conversation.participating_user_ets())) {
      this.deleteConversation(conversation);
      return Promise.resolve();
    }

    const isPreventAdminLessGroupsFeatureEnabled =
      this.teamState.teamFeatures()?.[FEATURE_KEY.PREVENT_ADMIN_LESS_GROUPS]?.status === FEATURE_STATUS.ENABLED;

    if (isPreventAdminLessGroupsFeatureEnabled) {
      const selfUser = this.userState.self();
      const roles = conversation.roles();
      const selfRole = roles[selfUser.id];
      const isSelfAdmin = selfRole === DefaultConversationRoleName.WIRE_ADMIN;
      const otherAdminCount = Object.entries(roles).filter(
        ([id, role]) => id !== selfUser.id && role === DefaultConversationRoleName.WIRE_ADMIN,
      ).length;
      const isLastAdmin = isSelfAdmin && otherAdminCount === 0;

      if (isLastAdmin) {
        const eligibleUsers = conversation
          .participating_user_ets()
          .filter(
            user =>
              !user.isFederated &&
              !user.isService &&
              user.type !== UserType.APP &&
              is.nonEmptyString(user.name()) &&
              is.nonEmptyString(user.username()) &&
              !user.isTemporaryGuest(),
          );

        useLeaveGroupAdminModalStore.getState().show({
          conversation,
          eligibleUsers,
          onLeave: async (clearContent, newAdmin) => {
            await this.conversationRepository.conversationRoleRepository.setMemberConversationRole(
              conversation,
              newAdmin.qualifiedId,
              DefaultConversationRoleName.WIRE_ADMIN,
            );

            conversation.roles({...roles, [newAdmin.id]: DefaultConversationRoleName.WIRE_ADMIN});

            await this.leaveOrClearConversation(conversation, {leave: true, clear: clearContent});
          },
          onDelete: () => this.deleteConversation(conversation),
        });
        return Promise.resolve();
      }
    }

    return new Promise(resolve => {
      PrimaryModal.show(
        PrimaryModal.type.OPTION,
        {
          primaryAction: {
            action: async (clearContent = false) => {
              await this.leaveOrClearConversation(conversation, {clear: clearContent, leave: true});
              resolve();
            },
            text: this.translate('modalConversationLeaveAction'),
          },
          text: {
            closeBtnLabel: this.translate('modalConversationLeaveMessageCloseBtn', {name: conversation.display_name()}),
            message: this.translate('modalConversationLeaveMessage'),
            option: this.translate('modalConversationLeaveOption'),
            title: this.translate('modalConversationLeaveHeadline', {name: conversation.display_name()}),
          },
        },
        undefined,
        this.translate,
      );
    });
  };

  readonly deleteConversation = (conversationEntity: Conversation) => {
    PrimaryModal.show(
      PrimaryModal.type.CONFIRM,
      {
        primaryAction: {
          action: () => this.conversationRepository.deleteConversation(conversationEntity),
          text: this.translate('modalConversationDeleteGroupAction'),
        },
        text: {
          message: this.translate('modalConversationDeleteGroupMessage'),
          title: conversationEntity.isChannel()
            ? this.translate('modalChannelDeleteGroupHeadline')
            : this.translate('modalGroupDeleteGroupHeadline'),
        },
      },
      undefined,
      this.translate,
    );
  };

  readonly removeConversation = (conversationEntity: Conversation) => {
    if (!conversationEntity.isGroupOrChannel() || !conversationEntity.isSelfUserRemoved()) {
      return;
    }

    PrimaryModal.show(
      PrimaryModal.type.CONFIRM,
      {
        primaryAction: {
          action: () => this.conversationRepository.deleteConversationLocally(conversationEntity, true),
          text: this.translate('modalConversationRemoveGroupAction'),
        },
        text: {
          message: this.translate('modalConversationRemoveGroupMessage'),
          title: this.translate('modalConversationRemoveGroupHeadline', {
            conversation: conversationEntity.display_name(),
          }),
        },
      },
      undefined,
      this.translate,
    );
  };

  getConversationById = async (conversation: QualifiedId): Promise<Conversation> => {
    return this.conversationRepository.getConversationById(conversation);
  };

  saveConversation = async (conversation: Conversation): Promise<Conversation> => {
    return this.conversationRepository.saveConversation(conversation);
  };

  getOrCreate1to1Conversation = async (userEntity: Pick<User, 'qualifiedId'>): Promise<Conversation> => {
    const conversationEntity = await this.conversationRepository.resolve1To1Conversation(userEntity.qualifiedId, {
      mls: {allowUnestablished: false},
    });
    if (conversationEntity) {
      return conversationEntity;
    }
    throw new Error(`Cannot find or create 1:1 conversation with user ID "${userEntity.qualifiedId.id}".`);
  };

  open1to1Conversation = (conversationEntity: Conversation): Promise<void> => {
    return this.openConversation(conversationEntity);
  };

  readonly open1to1ConversationWithService = async (serviceEntity?: ServiceEntity): Promise<void> => {
    if (serviceEntity === undefined) {
      throw new Error();
    }

    if (serviceEntity.isService) {
      const conversationEntity = await this.integrationRepository.get1To1ConversationWithService(serviceEntity);
      return this.openConversation(conversationEntity);
    }

    if (!serviceEntity.qualifiedId) {
      throw new Error("Can't create 1on1 conversation for an entity without qualifiedId");
    }

    const conversationEntity = await this.getOrCreate1to1Conversation({qualifiedId: serviceEntity.qualifiedId});
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

  removeFromConversation = async (conversationEntity?: Conversation, userEntity?: User): Promise<void> => {
    if (conversationEntity !== undefined && userEntity !== undefined) {
      if (userEntity.isService) {
        await this.integrationRepository.removeService(conversationEntity, userEntity);
        return;
      }

      if (userEntity.type === UserType.APP) {
        await this.conversationRepository.removeMembers(conversationEntity, [userEntity.qualifiedId]);
        return;
      }

      return new Promise((resolve, reject) => {
        PrimaryModal.show(
          PrimaryModal.type.CONFIRM,
          {
            primaryAction: {
              action: async () => {
                try {
                  await this.conversationRepository.removeMembers(conversationEntity, [userEntity.qualifiedId]);
                  resolve();
                } catch (error: unknown) {
                  reject(error);
                }
              },
              text: this.translate('modalConversationRemoveAction'),
            },
            text: {
              closeBtnLabel: this.translate('modalConversationRemoveCloseBtn'),
              message: this.translate('modalConversationRemoveMessage', {user: userEntity.name()}),
              title: this.translate('modalConversationRemoveHeadline'),
            },
          },
          undefined,
          this.translate,
        );
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

  readonly toggleMuteConversation = async (conversationEntity?: Conversation): Promise<void> => {
    if (conversationEntity !== undefined) {
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
      PrimaryModal.show(
        PrimaryModal.type.CONFIRM,
        {
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
            text: this.translate('modalUserUnblockAction'),
          },
          text: {
            message: this.translate('modalUserUnblockMessage', {user: userEntity.name()}),
            title: this.translate('modalUserUnblockHeadline'),
          },
        },
        undefined,
        this.translate,
      );
    });
  };
}
