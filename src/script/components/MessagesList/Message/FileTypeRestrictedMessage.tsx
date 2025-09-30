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

import {FileTypeRestrictedMessage as FileTypeRestrictedMessageEntity} from 'Repositories/entity/message/FileTypeRestrictedMessage';
import {t} from 'Util/LocalizerUtil';

interface FileTypeRestrictedMessageProps {
  message: FileTypeRestrictedMessageEntity;
}

const FileTypeRestrictedMessage: React.FC<FileTypeRestrictedMessageProps> = ({message}) => {
  return (
    <div className="message-header" data-uie-name="filetype-restricted-message">
      <div className="message-header-icon">
        <span className="icon-sysmsg-error text-red" />
      </div>
      {message.isIncoming ? (
        <p
          className="message-header-label"
          dangerouslySetInnerHTML={{__html: t('fileTypeRestrictedIncoming', {name: message.name})}}
          data-uie-name="filetype-restricted-message-text"
          data-uie-value="incoming"
        />
      ) : (
        <p
          className="message-header-label"
          dangerouslySetInnerHTML={{__html: t('fileTypeRestrictedOutgoing', {fileExt: message.fileExt})}}
          data-uie-name="filetype-restricted-message-text"
          data-uie-value="outgoing"
        />
      )}
    </div>
  );
};

export {FileTypeRestrictedMessage};
