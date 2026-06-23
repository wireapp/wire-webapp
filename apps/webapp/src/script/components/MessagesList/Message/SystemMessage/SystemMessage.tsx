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

import {ConversationSettingsIcon, MLSVerified} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {E2EIVerificationMessage} from 'Repositories/entity/message/e2eiVerificationMessage';
import {JoinedAfterMLSMigrationFinalisationMessage} from 'Repositories/entity/message/joinedAfterMlsMigrationFinalisationMessage';
import {MessageTimerUpdateMessage} from 'Repositories/entity/message/messageTimerUpdateMessage';
import {MLSConversationRecoveredMessage} from 'Repositories/entity/message/mlsConversationRecoveredMessage';
import {MLSMigrationFinalisationOngoingCallMessage} from 'Repositories/entity/message/mlsMigrationFinalisationOngoingCallMessage';
import {OneToOneMigratedToMlsMessage} from 'Repositories/entity/message/oneToOneMigratedToMlsMessage';
import {ProtocolUpdateMessage} from 'Repositories/entity/message/protocolUpdateMessage';
import {ReceiptModeUpdateMessage} from 'Repositories/entity/message/receiptModeUpdateMessage';
import {RenameMessage} from 'Repositories/entity/message/renameMessage';
import {SystemMessage as SystemMessageEntity} from 'Repositories/entity/message/systemMessage';

import {SystemMessageBase} from './SystemMessageBase';

import {messageBodyWrapper} from '../ContentMessage/ContentMessage.styles';
import {ProtocolUpdateMessage as ProtocolUpdateMessageComponent} from '../ProtocolUpdateMessage';
import { MemberRoleUpdateMessage } from 'Repositories/entity/message/memberRoleUpdateMessage';

interface SystemMessageProps {
  message: SystemMessageEntity;
}

export const SystemMessage = ({message}: SystemMessageProps) => {
  if (message instanceof RenameMessage) {
    return (
      <>
        <SystemMessageBase message={message} isSenderNameVisible icon={<Icon.EditIcon />} />
        <div css={messageBodyWrapper()}>
          <div className="message-body font-weight-bold">{message.name}</div>
        </div>
      </>
    );
  }

  if (message instanceof MemberRoleUpdateMessage) {
    return <SystemMessageBase message={message} icon={<ConversationSettingsIcon />} />;
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
