/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useState} from 'react';

import {ADD_PERMISSION, CONVERSATION_ACCESS} from '@wireapp/api-client/lib/conversation/';

import {TabIndex} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {ConversationAccess} from 'Components/Modals/CreateConversation/types';
import {getConversationAccessOptions, getConversationManagerOptions} from 'Components/Modals/CreateConversation/utils';
import {RadioGroup} from 'Components/Radio';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationRoleRepository} from 'Repositories/conversation/ConversationRoleRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {conversationAccessContainerCss, conversationAccessContentCss} from './Access.styles';

import {PanelHeader} from '../PanelHeader';

export interface AccessProps {
  onClose: () => void;
  onGoBack: () => void;
  conversationRepository: ConversationRepository;
  conversationRoleRepository: ConversationRoleRepository;
  activeConversation: Conversation;
}

export const Access = ({
  onGoBack,
  onClose,
  activeConversation,
  conversationRepository,
  conversationRoleRepository,
}: AccessProps) => {
  const {conversationModerator} = useKoSubscribableChildren(activeConversation, ['conversationModerator']);
  const [access, setAccess] = useState<ConversationAccess>(
    activeConversation.accessModes?.includes(CONVERSATION_ACCESS.LINK)
      ? ConversationAccess.Public
      : ConversationAccess.Private,
  );

  const {isPublicChannelsEnabled} = useChannelsFeatureFlag();

  const updateAddPermission = async (addPermission: ADD_PERMISSION) => {
    if (activeConversation.qualifiedId) {
      await conversationRepository.updateAddPermission(activeConversation.qualifiedId, addPermission);
    }
  };
  const canUpdateAddPermission = conversationRoleRepository.canToggleAddPermission(activeConversation);

  return (
    <div id="access-settings" className="panel__page">
      <PanelHeader
        onGoBack={onGoBack}
        onClose={onClose}
        goBackUie="go-back-access-options"
        title={t('conversationAccessTitle')}
      />

      <FadingScrollbar className="panel__content" css={conversationAccessContainerCss}>
        <p className="panel__info-text" tabIndex={TabIndex.FOCUSABLE}>
          {t('createConversationAccessText')}
        </p>

        <p className="panel__info-text" tabIndex={TabIndex.FOCUSABLE} css={conversationAccessContentCss}>
          {t('conversationAccessDisclaimer')}
        </p>

        <RadioGroup<ConversationAccess>
          onChange={setAccess}
          selectedValue={access}
          options={getConversationAccessOptions(isPublicChannelsEnabled)}
          ariaLabelledBy="conversation-access"
          name="conversation-access"
        />

        <p className="panel__info-text" tabIndex={TabIndex.FOCUSABLE} css={conversationAccessContentCss}>
          {t('createConversationManagerText')}
        </p>

        <RadioGroup<ADD_PERMISSION>
          disabled={access === ConversationAccess.Public || !canUpdateAddPermission}
          onChange={updateAddPermission}
          selectedValue={conversationModerator}
          options={getConversationManagerOptions()}
          ariaLabelledBy="conversation-manager"
          name="conversation-manager"
        />
      </FadingScrollbar>
    </div>
  );
};
