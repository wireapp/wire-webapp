/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import type {ConversationLabelRepository} from '../conversation/ConversationLabelRepository';
import type {Conversation} from '../entity/Conversation';
import {Context, ContextMenuEntry} from '../ui/ContextMenu';

export const showLabelContextMenu = (
  event: MouseEvent,
  conversation: Conversation,
  labelRepository: ConversationLabelRepository,
): void => {
  const newLabel: ContextMenuEntry = {
    click: () => labelRepository.addConversationToNewLabel(conversation),
    icon: 'plus-icon',
    label: t('conversationsPopoverNewFolder'),
  };
  const separator: ContextMenuEntry = {isSeparator: true};

  const noLabels: ContextMenuEntry = {
    isDisabled: true,
    label: t('conversationsPopoverNoCustomFolders'),
  };

  const conversationLabel = labelRepository.getConversationCustomLabel(conversation);
  const labels = labelRepository.getLabels().filter(label => !!labelRepository.getLabelConversations(label).length);
  const namedLabels: ContextMenuEntry[] = labels.length
    ? labels.map(label => ({
        click: () => labelRepository.addConversationToLabel(label, conversation),
        isChecked: label === conversationLabel,
        label: label.name,
      }))
    : [noLabels];

  const entries: ContextMenuEntry[] = [newLabel, separator, ...namedLabels];
  Context.from(event, entries, 'conversation-label-context-menu');
};
