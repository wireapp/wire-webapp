/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import React, {MouseEvent} from 'react';

import {Config} from 'src/script/Config';
import {Conversation} from 'src/script/entity/Conversation';

import {CancelEditButton} from './CancelEditButton/CancelEditButton';
import {EmojiButton} from './EmojiButton/EmojiButton';
import {FormatTextButton} from './FormatTextButton/FormatTextButton';
import {GiphyButton} from './GiphyButton/GiphyButton';
import {PingButton} from './PingButton/PingButton';

import {AssetUploadButton} from '../AssetUploadButton';
import {ImageUploadButton} from '../ImageUploadButton';
import {MessageTimerButton} from '../MessageTimerButton';

export type ControlButtonsProps = {
  input: string;
  conversation: Conversation;
  disablePing?: boolean;
  disableFilesharing?: boolean;
  isEditing?: boolean;
  isScaledDown?: boolean;
  isFormatActive: boolean;
  isEmojiActive: boolean;
  showGiphyButton?: boolean;
  onClickPing: () => void;
  onSelectFiles: (files: File[]) => void;
  onSelectImages: (files: File[]) => void;
  onCancelEditing: () => void;
  onGifClick: () => void;
  onFormatClick: () => void;
  onEmojiClick: (event: MouseEvent<HTMLButtonElement>) => void;
};

const ControlButtons: React.FC<ControlButtonsProps> = ({
  conversation,
  disablePing,
  disableFilesharing,
  input,
  isEditing,
  isScaledDown,
  isFormatActive,
  isEmojiActive,
  showGiphyButton,
  onClickPing,
  onSelectFiles,
  onSelectImages,
  onCancelEditing,
  onGifClick,
  onFormatClick,
  onEmojiClick,
}) => {
  if (isEditing) {
    return (
      <li>
        <CancelEditButton onClick={onCancelEditing} />
      </li>
    );
  }

  if (input.length === 0 || isScaledDown) {
    return (
      <>
        <li>
          <FormatTextButton isActive={isFormatActive} isScaledDown={!!isScaledDown} onClick={onFormatClick} />
        </li>
        <li>
          <EmojiButton isScaledDown={!!isScaledDown} isActive={isEmojiActive} onClick={onEmojiClick} />
        </li>
        {!disableFilesharing && (
          <>
            <li>
              <ImageUploadButton
                onSelectImages={onSelectImages}
                acceptedImageTypes={Config.getConfig().ALLOWED_IMAGE_TYPES}
              />
            </li>
            <li>
              <AssetUploadButton
                onSelectFiles={onSelectFiles}
                acceptedFileTypes={Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS}
              />
            </li>
          </>
        )}
        <li>
          <PingButton isDisabled={!!disablePing} isScaledDown={!!isScaledDown} onClick={onClickPing} />
        </li>
        <li>
          <MessageTimerButton conversation={conversation} />
        </li>
      </>
    );
  }

  return (
    <>
      {showGiphyButton && !disableFilesharing && (
        <>
          <li>
            <FormatTextButton isActive={isFormatActive} isScaledDown={false} onClick={onFormatClick} />
          </li>
          <li>
            <EmojiButton isActive={isEmojiActive} isScaledDown={false} onClick={onEmojiClick} />
          </li>
          <GiphyButton onGifClick={onGifClick} />
        </>
      )}
    </>
  );
};

export {ControlButtons};
