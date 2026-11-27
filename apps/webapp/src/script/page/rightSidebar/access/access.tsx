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

import {useState, type FunctionComponent} from 'react';

import {isNullOrUndefined} from '@sindresorhus/is';

import {conversationAccessContainerCss, conversationAccessContentCss} from './access.styles';

import {ADD_PERMISSION, CONVERSATION_ACCESS} from '../../../apiClient/conversation/conversation';
import {FadingScrollbar} from '../../../components/fadingScrollbar';
import {ConversationAccess} from '../../../components/modals/createConversation/types';
import {
  getConversationAccessOptions,
  getConversationManagerOptions,
} from '../../../components/modals/createConversation/utils';
import {RadioGroup} from '../../../components/radio';
import {ConversationRepository} from '../../../repositories/conversation/conversationRepository';
import {ConversationRoleRepository} from '../../../repositories/conversation/conversationRoleRepository';
import {Conversation} from '../../../repositories/entity/conversation';
import {TabIndex} from '../../../uiKit/utils/enums';
import {useKoSubscribableChildren} from '../../../util/componentUtil';
import {useChannelsFeatureFlag} from '../../../util/useChannelsFeatureFlag';
import {useApplicationContext} from '../../rootProvider';
import {PanelHeader} from '../panelHeader';

export interface AccessProps {
  onClose: () => void;
  onGoBack: () => void;
  conversationRepository: ConversationRepository;
  conversationRoleRepository: ConversationRoleRepository;
  activeConversation: Conversation;
}

export const Access: FunctionComponent<AccessProps> = ({
  onGoBack,
  onClose,
  activeConversation,
  conversationRepository,
  conversationRoleRepository,
}: AccessProps) => {
  const {translate} = useApplicationContext();
  const {conversationModerator} = useKoSubscribableChildren(activeConversation, ['conversationModerator']);
  const [access, setAccess] = useState<ConversationAccess>(
    activeConversation.accessModes?.includes(CONVERSATION_ACCESS.LINK) === true
      ? ConversationAccess.Public
      : ConversationAccess.Private,
  );

  const {isPublicChannelsEnabled} = useChannelsFeatureFlag();

  const updateAddPermission = async (addPermission: ADD_PERMISSION): Promise<void> => {
    if (!isNullOrUndefined(activeConversation.qualifiedId)) {
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
        title={translate('conversationAccessTitle')}
      />

      <FadingScrollbar className="panel__content" css={conversationAccessContainerCss}>
        <p className="panel__info-text" tabIndex={TabIndex.FOCUSABLE}>
          {translate('createConversationAccessText')}
        </p>

        <p className="panel__info-text" tabIndex={TabIndex.FOCUSABLE} css={conversationAccessContentCss}>
          {translate('conversationAccessDisclaimer')}
        </p>

        <RadioGroup<ConversationAccess>
          onChange={setAccess}
          selectedValue={access}
          options={getConversationAccessOptions(translate, isPublicChannelsEnabled)}
          ariaLabelledBy="conversation-access"
          name="conversation-access"
        />

        <p className="panel__info-text" tabIndex={TabIndex.FOCUSABLE} css={conversationAccessContentCss}>
          {translate('createConversationManagerText')}
        </p>

        <RadioGroup<ADD_PERMISSION>
          disabled={access === ConversationAccess.Public || !canUpdateAddPermission}
          onChange={updateAddPermission}
          selectedValue={conversationModerator}
          options={getConversationManagerOptions(translate)}
          ariaLabelledBy="conversation-manager"
          name="conversation-manager"
        />
      </FadingScrollbar>
    </div>
  );
};
