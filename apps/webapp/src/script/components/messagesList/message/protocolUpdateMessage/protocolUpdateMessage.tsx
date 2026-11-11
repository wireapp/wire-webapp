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

import type {FunctionComponent} from 'react';

import {CONVERSATION_PROTOCOL} from '../../../../apiClient/team/feature/featureList.types';
import {useApplicationContext} from '../../../../page/rootProvider';
import {ProtocolUpdateMessage as ProtocolUpdateMessageEntity} from '../../../../repositories/entity/message/protocolUpdateMessage';
import {SystemMessage} from '../../../../repositories/entity/message/systemMessage';
import {type Translate} from '../../../../util/localizerUtil';
import * as Icon from '../../../icon';
import {SystemMessageBase} from '../systemMessage/systemMessageBase';
import {renderMlsSystemMessageCaption} from '../systemMessage/systemMessageCaption';

interface ProtocolUpdateMessageProps {
  message: ProtocolUpdateMessageEntity;
}

const createSystemMessage = (caption: string, translate: Translate): SystemMessage => {
  const message = new SystemMessage(translate);
  message.caption = caption;
  return message;
};

export const ProtocolUpdateMessage: FunctionComponent<ProtocolUpdateMessageProps> = ({
  message,
}: ProtocolUpdateMessageProps) => {
  const {translate} = useApplicationContext();
  if (message.protocol === CONVERSATION_PROTOCOL.MIXED) {
    const messages = [
      {
        caption: translate('conversationProtocolUpdatedToMixedPart1'),
        captionContent: renderMlsSystemMessageCaption(translate('conversationProtocolUpdatedToMixedPart1')),
      },
      {
        caption: translate('conversationProtocolUpdatedToMixedPart2'),
        captionContent: translate('conversationProtocolUpdatedToMixedPart2'),
      },
    ];
    return (
      <>
        {messages.map(({caption, captionContent}) => {
          return (
            <SystemMessageBase
              key={caption}
              icon={<Icon.InfoIcon />}
              message={createSystemMessage(caption, translate)}
              captionContent={captionContent}
            />
          );
        })}
      </>
    );
  }

  const caption = translate('conversationProtocolUpdatedToMLS');
  return (
    <SystemMessageBase
      message={createSystemMessage(caption, translate)}
      icon={<Icon.InfoIcon />}
      captionContent={renderMlsSystemMessageCaption(caption)}
    />
  );
};
