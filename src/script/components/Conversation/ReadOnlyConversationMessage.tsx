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

import {FC} from 'react';

import {Link, LinkVariant} from '@wireapp/react-ui-kit';

import {Icon} from 'Components/Icon';
import {CONVERSATION_READONLY_STATE} from 'src/script/conversation/ConversationRepository';
import {t} from 'Util/LocalizerUtil';

interface ReadOnlyConversationMessageProps {
  state: CONVERSATION_READONLY_STATE;
  handleMLSUpdate: () => void;
  displayName: string;
}
export const ReadOnlyConversationMessage: FC<ReadOnlyConversationMessageProps> = ({
  state,
  handleMLSUpdate,
  displayName,
}) => {
  const mlsCompatibilityMessage =
    state === CONVERSATION_READONLY_STATE.READONLY_OTHER_DOES_NOT_SUPPORT_MLS
      ? t('otherUserNotSupportMLSMsg', displayName)
      : t('selfNotSupportMLSMsgPart1', displayName);

  return (
    <div className="readonly-message-header readonly-message-container">
      <div className="readonly-message-header-icon readonly-message-header-icon--svg">
        <div>
          <Icon.Info />
        </div>
      </div>
      <div className="readonly-message-header-label" data-uie-name="element-readonly-conversation">
        <span
          dangerouslySetInnerHTML={{
            __html: mlsCompatibilityMessage,
          }}
        />
        {state === CONVERSATION_READONLY_STATE.READONLY_SELF_DOES_NOT_SUPPORT_MLS && (
          <>
            <Link
              css={{fontSize: 'var(--font-size-small)', marginLeft: 2, fontWeight: 600}}
              onClick={handleMLSUpdate}
              variant={LinkVariant.PRIMARY}
              data-uie-name="do-update-mls"
            >
              {t('downloadLatestMLS')}
            </Link>
            <span
              css={{marginLeft: 5}}
              dangerouslySetInnerHTML={{
                __html: t('selfNotSupportMLSMsgPart2'),
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};
