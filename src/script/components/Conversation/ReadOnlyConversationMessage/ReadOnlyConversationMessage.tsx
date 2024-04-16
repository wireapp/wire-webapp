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

import ko from 'knockout';

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {CONVERSATION_READONLY_STATE} from 'src/script/conversation/ConversationRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {replaceReactComponents} from 'Util/LocalizerUtil/ReactLocalizerUtil';

interface ReadOnlyConversationMessageProps {
  reloadApp: () => void;
  conversation: Conversation;
}
export const ReadOnlyConversationMessage: FC<ReadOnlyConversationMessageProps> = ({conversation, reloadApp}) => {
  const {
    readOnlyState,
    is1to1,
    participating_user_ets: participatingUserEts,
  } = useKoSubscribableChildren(conversation, ['readOnlyState', 'is1to1', 'participating_user_ets']);

  const user = (is1to1 && participatingUserEts[0]) || null;
  const {isBlocked: isUserBlocked} = useKoSubscribableChildren(user || {isBlocked: ko.observable(false)}, [
    'isBlocked',
  ]);

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
              {replaceReactComponents(t('otherUserNotSupportMLSMsg'), [
                {
                  exactMatch: '{{participantName}}',
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
              {replaceReactComponents(t('selfNotSupportMLSMsgPart1'), [
                {
                  exactMatch: '{{selfUserName}}',
                  render: () => <strong>{user.name()}</strong>,
                },
              ])}
            </span>
            <>
              {' '}
              <Link
                css={{fontSize: 'var(--font-size-small)', fontWeight: 600}}
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
    }
  }

  return null;
};

const ReadOnlyConversationMessageBase = ({children}: {children: ReactNode}) => {
  return (
    <div className="readonly-message-header readonly-message-container">
      <div className="readonly-message-header-icon readonly-message-header-icon--svg">
        <div>
          <Icon.Info />
        </div>
      </div>
      <p className="readonly-message-header-label" data-uie-name="element-readonly-conversation">
        {children}
      </p>
    </div>
  );
};
