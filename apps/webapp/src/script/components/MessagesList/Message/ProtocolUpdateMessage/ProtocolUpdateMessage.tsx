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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {Icon} from 'Components/Icon';
import {Config} from 'src/script/Config';
import {ProtocolUpdateMessage as ProtocolUpdateMessageEntity} from 'src/script/entity/message/ProtocolUpdateMessage';
import {SystemMessage} from 'src/script/entity/message/SystemMessage';
import {replaceLink, t} from 'Util/LocalizerUtil';

import {SystemMessageBase} from '../SystemMessage/SystemMessageBase';

interface ProtocolUpdateMessageProps {
  message: ProtocolUpdateMessageEntity;
}

const createSystemMessage = (caption: string) => {
  const message = new SystemMessage();
  message.caption = caption;
  return message;
};

export const ProtocolUpdateMessage = ({message}: ProtocolUpdateMessageProps) => {
  if (message.protocol === ConversationProtocol.MIXED) {
    const captions = [
      t('conversationProtocolUpdatedToMixedPart1', {}, replaceLink(Config.getConfig().URL.SUPPORT.MLS_LEARN_MORE)),
      t('conversationProtocolUpdatedToMixedPart2'),
    ];
    const messages = captions.map(createSystemMessage);
    return (
      <>
        {messages.map(message => (
          <SystemMessageBase key={message.caption} icon={<Icon.Info />} message={message} />
        ))}
      </>
    );
  }

  const migratedToMLSMessage = createSystemMessage(
    t('conversationProtocolUpdatedToMLS', {}, replaceLink(Config.getConfig().URL.SUPPORT.MLS_LEARN_MORE)),
  );
  return <SystemMessageBase message={migratedToMLSMessage} icon={<Icon.Info />} />;
};
