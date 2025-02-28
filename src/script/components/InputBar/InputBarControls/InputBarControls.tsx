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

import {useEffect} from 'react';

import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';

import {Config} from 'src/script/Config';
import {Conversation} from 'src/script/entity/Conversation';

import {ControlButtons} from './ControlButtons';
import {SendMessageButton} from './SendMessageButton/SendMessageButton';

import {MessageContent} from '../common/messageContent/messageContent';

interface InputBarControlsProps {
  conversation: Conversation;
  isFileSharingSendingEnabled: boolean;
  pingDisabled: boolean;
  messageContent: MessageContent;
  isEditing: boolean;
  showMarkdownPreview: boolean;
  showGiphyButton: boolean;
  formatToolbar: {
    open: boolean;
    handleClick: () => void;
  };
  emojiPicker: {
    open: boolean;
    handleToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
  };
  onEscape: () => void;
  onClickPing: () => void;
  onGifClick: () => void;
  onSelectFiles: (files: File[]) => void;
  onSelectImages: (files: File[]) => void;
  onSend: () => void;
}

export const InputBarControls = ({
  conversation,
  isFileSharingSendingEnabled,
  pingDisabled,
  messageContent,
  isEditing,
  showMarkdownPreview,
  showGiphyButton,
  formatToolbar,
  emojiPicker,
  onEscape,
  onClickPing,
  onGifClick,
  onSelectFiles,
  onSelectImages,
  onSend,
}: InputBarControlsProps) => {
  const enableSending = messageContent.text.length > 0;

  const isMessageFormatButtonsFlagEnabled = Config.getConfig().FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;

  useEffect(() => {
    amplify.subscribe(WebAppEvents.SHORTCUT.PING, onClickPing);

    return () => {
      amplify.unsubscribeAll(WebAppEvents.SHORTCUT.PING);
    };
  }, [onClickPing]);

  return (
    <div className="input-bar-buttons">
      <ul className="input-bar-controls">
        <ControlButtons
          conversation={conversation}
          disableFilesharing={!isFileSharingSendingEnabled}
          disablePing={pingDisabled}
          input={messageContent.text}
          isEditing={isEditing}
          onCancelEditing={onEscape}
          onClickPing={onClickPing}
          onGifClick={onGifClick}
          onSelectFiles={onSelectFiles}
          onSelectImages={onSelectImages}
          showGiphyButton={showGiphyButton}
          showFormatButton={isMessageFormatButtonsFlagEnabled && showMarkdownPreview}
          showEmojiButton={isMessageFormatButtonsFlagEnabled}
          isFormatActive={formatToolbar.open}
          isEmojiActive={emojiPicker.open}
          onFormatClick={formatToolbar.handleClick}
          onEmojiClick={emojiPicker.handleToggle}
        />
      </ul>
      <SendMessageButton disabled={!enableSending} onSend={onSend} className="input-bar-buttons__send" />
    </div>
  );
};
