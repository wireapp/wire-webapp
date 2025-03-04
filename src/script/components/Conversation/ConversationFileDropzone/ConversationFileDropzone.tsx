/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {ReactNode} from 'react';

import cx from 'classnames';

import {DropFileArea} from 'Components/DropFileArea';
import {incomingCssClass, removeAnimationsClass} from 'Util/util';

import {FileDropzone} from './FileDropzone/FileDropzone';

interface ConversationFileDropzoneProps {
  inTeam: boolean;
  isCellsEnabled: boolean;
  isConversationLoaded: boolean;
  activeConversationId?: string;
  onFileDropped: (files: File[]) => void;
  children: ReactNode;
}

export const ConversationFileDropzone = ({
  inTeam,
  isCellsEnabled,
  isConversationLoaded,
  activeConversationId,
  onFileDropped,
  children,
}: ConversationFileDropzoneProps) => {
  if (isCellsEnabled) {
    return (
      <FileDropzone isTeam={inTeam}>
        <div
          id="conversation"
          className={cx('conversation', {[incomingCssClass]: isConversationLoaded, loading: !isConversationLoaded})}
          ref={removeAnimationsClass}
          key={activeConversationId}
        >
          {children}
        </div>
      </FileDropzone>
    );
  }

  return (
    <DropFileArea
      onFileDropped={onFileDropped}
      id="conversation"
      className={cx('conversation', {[incomingCssClass]: isConversationLoaded, loading: !isConversationLoaded})}
      ref={removeAnimationsClass}
      key={activeConversationId}
    >
      {children}
    </DropFileArea>
  );
};
