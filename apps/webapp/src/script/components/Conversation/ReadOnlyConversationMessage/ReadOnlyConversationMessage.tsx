/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {FC, ReactNode} from 'react';

import * as Icon from 'Components/Icon';
import ko from 'knockout';
import {CONVERSATION_READONLY_STATE} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {replaceReactComponents} from 'Util/LocalizerUtil/ReactLocalizerUtil';

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

interface ReadOnlyConversationMessageProps {
  reloadApp: () => void;
  conversation: Conversation;
}

const userPlaceholder = {isBlocked: ko.observable(false)};

export const ReadOnlyConversationMessage: FC<ReadOnlyConversationMessageProps> = ({conversation, reloadApp}) => {
  const {
    readOnlyState,
    is1to1,
    participating_user_ets: participatingUserEts,
  } = useKoSubscribableChildren(conversation, ['readOnlyState', 'is1to1', 'participating_user_ets']);

  const user = (is1to1 && participatingUserEts[0]) || null;
  const {isBlocked: isUserBlocked} = useKoSubscribableChildren(user || userPlaceholder, ['isBlocked']);

  if (!user) {
    // This should never happen for 1:1 conversations
    return null;
  }

  if (isUserBlocked) {
    return (
      <ReadOnlyConversationMessageBase>
        <span>{t('conversationWithBlockedUser')}</span>
      </ReadOnlyConversationMessageBase>
    );
  }

  if (readOnlyState) {
    switch (readOnlyState) {
      case CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_OTHER_UNSUPPORTED_MLS:
        return (
          <ReadOnlyConversationMessageBase>
            <span>
              {replaceReactComponents(t('otherUserNotSupportMLSMsg', {participantName: '{participantName}'}), [
                {
                  exactMatch: '{participantName}',
                  render: () => <strong>{user.name()}</strong>,
                },
              ])}
            </span>
          </ReadOnlyConversationMessageBase>
        );
      case CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_SELF_UNSUPPORTED_MLS:
        return (
          <ReadOnlyConversationMessageBase>
            <span>
              {replaceReactComponents(t('selfNotSupportMLSMsgPart1', {selfUserName: '{selfUserName}'}), [
                {
                  exactMatch: '{selfUserName}',
                  render: () => <strong>{user.name()}</strong>,
                },
              ])}
            </span>
            <>
              {' '}
              <Link
                css={{fontSize: 'var(--font-size-small)', fontWeight: 'var(--font-weight-semibold)'}}
                onClick={reloadApp}
                variant={LinkVariant.PRIMARY}
                data-uie-name="do-update-mls"
              >
                {t('downloadLatestMLS')}
              </Link>{' '}
              <span>{t('selfNotSupportMLSMsgPart2')}</span>
            </>
          </ReadOnlyConversationMessageBase>
        );
      case CONVERSATION_READONLY_STATE.READONLY_ONE_TO_ONE_NO_KEY_PACKAGES:
        return (
          <ReadOnlyConversationMessageBase>
            <span>
              {replaceReactComponents(t('otherUserNoAvailableKeyPackages', {participantName: '{participantName}'}), [
                {
                  exactMatch: '{participantName}',
                  render: () => <strong>{user.name()}</strong>,
                },
              ])}
            </span>
          </ReadOnlyConversationMessageBase>
        );
    }
  }

  return null;
};

const ReadOnlyConversationMessageBase = ({children}: {children: ReactNode}) => {
  return (
    <div className="readonly-message-header readonly-message-container">
      <div className="readonly-message-header-icon readonly-message-header-icon--svg">
        <div>
          <Icon.InfoIcon />
        </div>
      </div>
      <p className="readonly-message-header-label" data-uie-name="element-readonly-conversation">
        {children}
      </p>
    </div>
  );
};
