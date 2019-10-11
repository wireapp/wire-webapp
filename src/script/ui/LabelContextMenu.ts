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

import {ConversationLabelRepository} from '../conversation/ConversationLabelRepository';
import {Conversation} from '../entity/Conversation';
import {Context} from '../ui/ContextMenu';

export const showLabelContextMenu = (
  event: MouseEvent,
  conversation: Conversation,
  labelRepository: ConversationLabelRepository,
): void => {
  const newLabel = {
    click: () => labelRepository.addConversationToNewLabel(conversation),
    icon: 'plus-icon',
    label: t('conversationsPopoverNewFolder'),
  };
  const separator = {isSeparator: true};

  const noLabels = {
    isDisabled: true,
    label: t('conversationsPopoverNoCustomFolders'),
  };

  const conversationLabelId = labelRepository.getConversationLabelId(conversation);

  const labels = labelRepository.getLabels();
  const namedLabels = labels.length
    ? labels.map(label => ({
        click: () => labelRepository.addConversationToLabel(label, conversation),
        isChecked: label.id === conversationLabelId,
        label: label.name,
      }))
    : [noLabels];

  const entries = [newLabel, separator, ...namedLabels];
  Context.from(event, entries, 'conversation-label-context-menu');
};
