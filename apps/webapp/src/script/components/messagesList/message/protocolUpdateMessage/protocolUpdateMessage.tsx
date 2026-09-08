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

import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import * as Icon from 'Components/icon';
import {ProtocolUpdateMessage as ProtocolUpdateMessageEntity} from 'Repositories/entity/message/protocolUpdateMessage';
import {SystemMessage} from 'Repositories/entity/message/systemMessage';
import {Config} from 'src/script/Config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {type Translate, replaceLink} from 'Util/localizerUtil';

import {SystemMessageBase} from '../systemMessage/systemMessageBase';

interface ProtocolUpdateMessageProps {
  message: ProtocolUpdateMessageEntity;
}

const createSystemMessage = (caption: string, translate: Translate) => {
  const message = new SystemMessage(translate);
  message.caption = caption;
  return message;
};

export const ProtocolUpdateMessage = ({message}: ProtocolUpdateMessageProps) => {
  const {translate} = useApplicationContext();
  if (message.protocol === CONVERSATION_PROTOCOL.MIXED) {
    const captions = [
      translate(
        'conversationProtocolUpdatedToMixedPart1',
        undefined,
        replaceLink(Config.getConfig().URL.SUPPORT.MLS_LEARN_MORE),
      ),
      translate('conversationProtocolUpdatedToMixedPart2'),
    ];
    const messages = captions.map(caption => createSystemMessage(caption, translate));
    return (
      <>
        {messages.map(message => (
          <SystemMessageBase key={message.caption} icon={<Icon.InfoIcon />} message={message} />
        ))}
      </>
    );
  }

  const migratedToMLSMessage = createSystemMessage(
    translate(
      'conversationProtocolUpdatedToMLS',
      undefined,
      replaceLink(Config.getConfig().URL.SUPPORT.MLS_LEARN_MORE),
    ),
    translate,
  );
  return <SystemMessageBase message={migratedToMLSMessage} icon={<Icon.InfoIcon />} />;
};
