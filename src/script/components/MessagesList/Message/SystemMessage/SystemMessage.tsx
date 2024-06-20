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

import React from 'react';

import {MLSVerified} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {E2EIVerificationMessage} from 'src/script/entity/message/E2EIVerificationMessage';
import {JoinedAfterMLSMigrationFinalisationMessage} from 'src/script/entity/message/JoinedAfterMLSMigrationFinalisationMessage';
import {MessageTimerUpdateMessage} from 'src/script/entity/message/MessageTimerUpdateMessage';
import {MLSConversationRecoveredMessage} from 'src/script/entity/message/MLSConversationRecoveredMessage';
import {MLSMigrationFinalisationOngoingCallMessage} from 'src/script/entity/message/MLSMigrationFinalisationOngoingCallMessage';
import {OneToOneMigratedToMlsMessage} from 'src/script/entity/message/OneToOneMigratedToMlsMessage';
import {ProtocolUpdateMessage} from 'src/script/entity/message/ProtocolUpdateMessage';
import {ReceiptModeUpdateMessage} from 'src/script/entity/message/ReceiptModeUpdateMessage';
import {RenameMessage} from 'src/script/entity/message/RenameMessage';
import {SystemMessage as SystemMessageEntity} from 'src/script/entity/message/SystemMessage';

import {SystemMessageBase} from './SystemMessageBase';

import {ProtocolUpdateMessage as ProtocolUpdateMessageComponent} from '../ProtocolUpdateMessage';

export interface SystemMessageProps {
  message: SystemMessageEntity;
}

export const SystemMessage: React.FC<SystemMessageProps> = ({message}) => {
  if (message instanceof RenameMessage) {
    return (
      <>
        <SystemMessageBase message={message} isSenderNameVisible icon={<Icon.EditIcon />} />
        <div className="message-body font-weight-bold">{message.name}</div>
      </>
    );
  }

  if (message instanceof MessageTimerUpdateMessage) {
    return <SystemMessageBase message={message} isSenderNameVisible icon={<Icon.TimerIcon />} />;
  }

  if (message instanceof ReceiptModeUpdateMessage) {
    return <SystemMessageBase message={message} isSenderNameVisible icon={<Icon.ReadIcon />} />;
  }

  if (message instanceof MLSConversationRecoveredMessage) {
    return <SystemMessageBase message={message} icon={<Icon.InfoIcon />} />;
  }

  if (message instanceof E2EIVerificationMessage) {
    return <SystemMessageBase message={message} icon={<MLSVerified className="filled" />} />;
  }

  if (message instanceof ProtocolUpdateMessage) {
    return <ProtocolUpdateMessageComponent message={message} />;
  }

  if (message instanceof JoinedAfterMLSMigrationFinalisationMessage) {
    return <SystemMessageBase message={message} icon={<Icon.InfoIcon />} />;
  }

  if (message instanceof OneToOneMigratedToMlsMessage) {
    return <SystemMessageBase message={message} icon={<Icon.InfoIcon />} />;
  }

  if (message instanceof MLSMigrationFinalisationOngoingCallMessage) {
    return <SystemMessageBase message={message} icon={<Icon.InfoIcon />} />;
  }

  return <SystemMessageBase message={message} />;
};
