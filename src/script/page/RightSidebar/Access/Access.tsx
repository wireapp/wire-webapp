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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {useConversationDetailsOption} from 'Components/Modals/CreateConversation/hooks/useConversationDetailsOption';
import {ConversationAccess, ConversationManager} from 'Components/Modals/CreateConversation/types';
import {RadioGroup} from 'Components/Radio';
import {t} from 'Util/LocalizerUtil';

import {conversationAccessContainerCss, conversationAccessContentCss} from './Access.styles';

import {PanelHeader} from '../PanelHeader';

export interface AccessProps {
  onClose: () => void;
  onGoBack: () => void;
}

export const Access = ({onGoBack, onClose}: AccessProps) => {
  const [access, setAccess] = useState<ConversationAccess>(ConversationAccess.Public);
  const [manager, setManager] = useState<ConversationManager>(ConversationManager.AdminsAndMembers);
  const {conversationAccessOptions, conversationManagerOptions} = useConversationDetailsOption();

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
          options={conversationAccessOptions}
          ariaLabelledBy="conversation-access"
          name="conversation-access"
        />

        <p className="panel__info-text" tabIndex={TabIndex.FOCUSABLE} css={conversationAccessContentCss}>
          {t('createConversationManagerText')}
        </p>

        <RadioGroup<ConversationManager>
          disabled={access === ConversationAccess.Public}
          onChange={setManager}
          selectedValue={manager}
          options={conversationManagerOptions}
          ariaLabelledBy="conversation-manager"
          name="conversation-manager"
        />
      </FadingScrollbar>
    </div>
  );
};
