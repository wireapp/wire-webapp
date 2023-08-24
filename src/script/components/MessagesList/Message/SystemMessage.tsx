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

import React, {ReactNode} from 'react';

import {Icon} from 'Components/Icon';
import {SystemMessage as SystemMessageEntity} from 'src/script/entity/message/SystemMessage';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {MessageTime} from './MessageTime';

import {SystemMessageIcon} from '../../../message/SystemMessageType';
export interface SystemMessageProps {
  message: SystemMessageEntity;
  children?: ReactNode;
}

const SystemMessage: React.FC<SystemMessageProps> = ({message, children}) => {
  const {unsafeSenderName, timestamp, caption} = useKoSubscribableChildren(message, [
    'unsafeSenderName',
    'timestamp',
    'caption',
  ]);

  return (
    <>
      <div className="message-header" data-uie-name="element-message-system">
        {message.icon && (
          <div className="message-header-icon message-header-icon--svg text-foreground">
            <IconComponent icon={message.icon} />
          </div>
        )}
        <p className="message-header-label">
          <span className="message-header-label__multiline">
            {message.includeSenderName && <span className="message-header-sender-name">{unsafeSenderName}</span>}
            <span className="ellipsis">{caption}</span>
          </span>
        </p>
        <div className="message-body-actions">
          <MessageTime timestamp={timestamp} data-uie-uid={message.id} data-uie-name="item-message-call-timestamp" />
        </div>
      </div>
      {children}
    </>
  );
};

export {SystemMessage};

const iconToComponentMap: Record<SystemMessageIcon, React.FC> = {
  [SystemMessageIcon.EDIT]: () => <Icon.Edit />,
  [SystemMessageIcon.TIMER]: () => <Icon.Timer />,
  [SystemMessageIcon.READ]: () => <Icon.Read />,
};

const IconComponent = ({icon}: {icon: SystemMessageIcon}) => {
  const IconComponent = iconToComponentMap[icon];
  return <IconComponent />;
};
