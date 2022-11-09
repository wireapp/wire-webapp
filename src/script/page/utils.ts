/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {t} from 'Util/LocalizerUtil';

import {ShowConversationOptions} from './AppMain';
import {ListState} from './useAppState';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {ConversationState} from '../conversation/ConversationState';
import {Conversation} from '../entity/Conversation';
import {showContextMenu} from '../ui/ContextMenu';
import {showLabelContextMenu} from '../ui/LabelContextMenu';
import {Shortcut} from '../ui/Shortcut';
import {ShortcutType} from '../ui/ShortcutType';
import {ActionsViewModel} from '../view_model/ActionsViewModel';

export const shiftContent = (element: HTMLDivElement | null, hideSidebar: boolean = false) => {
  if (hideSidebar) {
    if (element) {
      element.style.visibility = 'hidden';
    }
  } else if (element) {
    element.style.visibility = '';
  }
};

type ContextMenuProps = {
  archivedConversations: Conversation[];
  isProAccount: boolean;
  conversationRepository: ConversationRepository;
  actionsView: ActionsViewModel;
  showConversation: (
    conversation: Conversation | string,
    options?: ShowConversationOptions,
    domain?: string | null,
  ) => void;
  switchList: (listState: ListState) => void;
  listState: ListState;
  onArchive: (conversation: Conversation) => void;
  conversationState: ConversationState;
};

export const onContextMenu =
  ({
    archivedConversations,
    isProAccount,
    conversationRepository,
    actionsView,
    showConversation,
    switchList,
    listState,
    onArchive,
    conversationState,
  }: ContextMenuProps) =>
  (conversationEntity: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
    const entries = [];

    const shouldHideConversation = (conversationEntity: Conversation): boolean => {
      const isStateConversations = listState === ListState.CONVERSATIONS;
      const isActiveConversation = conversationState.isActiveConversation(conversationEntity);

      return isStateConversations && isActiveConversation;
    };

    if (conversationEntity.isMutable()) {
      const notificationsShortcut = Shortcut.getShortcutTooltip(ShortcutType.NOTIFICATIONS);

      if (isProAccount) {
        entries.push({
          click: () => {
            showConversation(conversationEntity, {openNotificationSettings: true});
          },
          label: t('conversationsPopoverNotificationSettings'),
          title: t('tooltipConversationsNotifications', notificationsShortcut),
        });
      } else {
        const label = conversationEntity.showNotificationsNothing()
          ? t('conversationsPopoverNotify')
          : t('conversationsPopoverSilence');
        const title = conversationEntity.showNotificationsNothing()
          ? t('tooltipConversationsNotify', notificationsShortcut)
          : t('tooltipConversationsSilence', notificationsShortcut);

        entries.push({
          click: () => actionsView.toggleMuteConversation(conversationEntity),
          label,
          title,
        });
      }
    }

    if (!conversationEntity.is_archived()) {
      const {conversationLabelRepository} = conversationRepository;

      if (!conversationLabelRepository.isFavorite(conversationEntity)) {
        entries.push({
          click: () => conversationLabelRepository.addConversationToFavorites(conversationEntity),
          label: t('conversationPopoverFavorite'),
        });
      } else {
        entries.push({
          click: () => conversationLabelRepository.removeConversationFromFavorites(conversationEntity),
          label: t('conversationPopoverUnfavorite'),
        });
      }

      const customLabel = conversationLabelRepository.getConversationCustomLabel(conversationEntity);

      if (customLabel) {
        entries.push({
          click: () => conversationLabelRepository.removeConversationFromLabel(customLabel, conversationEntity),
          label: t('conversationsPopoverRemoveFrom', customLabel.name),
        });
      }

      entries.push({
        click: () => showLabelContextMenu(event, conversationEntity, conversationLabelRepository),
        label: t('conversationsPopoverMoveTo'),
      });
    }

    if (conversationEntity.is_archived()) {
      entries.push({
        click: () => {
          conversationRepository.unarchiveConversation(conversationEntity, true, 'manual un-archive').then(() => {
            if (!archivedConversations.length) {
              switchList(ListState.CONVERSATIONS);
            }
          });
        },
        label: t('conversationsPopoverUnarchive'),
      });
    } else {
      const shortcut = Shortcut.getShortcutTooltip(ShortcutType.ARCHIVE);

      entries.push({
        click: () => onArchive(conversationEntity),
        label: t('conversationsPopoverArchive'),
        title: t('tooltipConversationsArchive', shortcut),
      });
    }

    if (conversationEntity.isRequest()) {
      entries.push({
        click: () => {
          const userEntity = conversationEntity.firstUserEntity();
          const hideConversation = shouldHideConversation(conversationEntity);
          const nextConversationEntity = conversationRepository.getNextConversation(conversationEntity);

          actionsView.cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity);
        },
        label: t('conversationsPopoverCancel'),
      });
    }

    if (conversationEntity.isClearable()) {
      entries.push({
        click: () => actionsView.clearConversation(conversationEntity),
        label: t('conversationsPopoverClear'),
      });
    }

    if (!conversationEntity.isGroup()) {
      const userEntity = conversationEntity.firstUserEntity();
      const canBlock = userEntity && (userEntity.isConnected() || userEntity.isRequest());

      if (canBlock) {
        entries.push({
          click: async () => {
            const userEntity = conversationEntity.firstUserEntity();
            const hideConversation = shouldHideConversation(conversationEntity);
            const nextConversationEntity = conversationRepository.getNextConversation(conversationEntity);

            await actionsView.blockUser(userEntity, hideConversation, nextConversationEntity);
          },
          label: t('conversationsPopoverBlock'),
        });
      }
    }

    if (conversationEntity.isLeavable()) {
      entries.push({
        click: () => actionsView.leaveConversation(conversationEntity),
        label: t('conversationsPopoverLeave'),
      });
    }

    showContextMenu(event, entries, 'conversation-list-options-menu');
  };
