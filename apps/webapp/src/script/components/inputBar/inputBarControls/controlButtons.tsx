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

import {MouseEvent} from 'react';

import {CONVERSATION_CELLS_STATE} from '@wireapp/api-client/lib/conversation/';

import {FormatSeparator} from 'Components/inputBar/common/formatseparator/formatseparator';
import {Conversation} from 'Repositories/entity/conversation';
import {Config} from 'src/script/config';

import {AssetUploadButton} from './assetuploadbutton/assetuploadbutton';
import {CancelEditButton} from './canceleditbutton/canceleditbutton';
import {CellAssetUploadButton} from './cellassetuploadbutton/cellassetuploadbutton';
import {CellImageUploadButton} from './cellimageuploadbutton/cellimageuploadbutton';
import {EmojiButton} from './emojibutton/emojibutton';
import {FormatTextButton} from './formattextbutton/formattextbutton';
import {GiphyButton} from './giphybutton/giphybutton';
import {ImageUploadButton} from './imageuploadbutton/imageuploadbutton';
import {MessageTimerButton} from './messagetimerbutton/messagetimerbutton';
import {PingButton} from './pingbutton/pingbutton';

interface ControlButtonsProps {
  input: string;
  conversation: Conversation;
  disablePing?: boolean;
  disableFilesharing?: boolean;
  isCellsFeatureEnabled?: boolean;
  isEditing?: boolean;
  isFormatActive: boolean;
  isEmojiActive: boolean;
  showGiphyButton?: boolean;
  showFormatButton: boolean;
  showEmojiButton: boolean;
  onClickPing: () => void;
  onSelectFiles: (files: File[]) => void;
  onSelectImages: (files: File[]) => void;
  onCancelEditing: () => void;
  onGifClick: () => void;
  onFormatClick: () => void;
  onEmojiClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onCellAssetUpload: () => void;
  onCellImageUpload: () => void;
}

const ControlButtons = ({
  conversation,
  disablePing,
  disableFilesharing,
  input,
  isCellsFeatureEnabled,
  isEditing,
  isFormatActive,
  isEmojiActive,
  showGiphyButton,
  showFormatButton,
  showEmojiButton,
  onClickPing,
  onSelectFiles,
  onSelectImages,
  onCancelEditing,
  onGifClick,
  onFormatClick,
  onEmojiClick,
  onCellImageUpload,
  onCellAssetUpload,
}: ControlButtonsProps) => {
  const isCellsEnabled = Config.getConfig().FEATURE.ENABLE_CELLS && isCellsFeatureEnabled === true;
  const isCellsConversation = isCellsEnabled && conversation.cellsState() !== CONVERSATION_CELLS_STATE.DISABLED;
  const isFilesharingEnabled = disableFilesharing !== true;

  if (isEditing === true) {
    return (
      <>
        {showFormatButton === true && (
          <li>
            <FormatTextButton isActive={isFormatActive} isEditing onClick={onFormatClick} />
          </li>
        )}

        {showEmojiButton === true && (
          <li>
            <EmojiButton isActive={isEmojiActive} isEditing onClick={onEmojiClick} />
          </li>
        )}
        {(showFormatButton === true || showEmojiButton === true) && (
          <li aria-hidden="true">
            <FormatSeparator isEditing />
          </li>
        )}
        <li>
          <CancelEditButton isEditing onClick={onCancelEditing} />
        </li>
      </>
    );
  }

  if (input.length === 0) {
    return (
      <>
        {showFormatButton && (
          <li>
            <FormatTextButton isActive={isFormatActive} onClick={onFormatClick} />
          </li>
        )}

        {showEmojiButton && (
          <li>
            <EmojiButton isActive={isEmojiActive} onClick={onEmojiClick} />
          </li>
        )}
        {isFilesharingEnabled && (
          <>
            <li>
              {isCellsConversation ? (
                <CellImageUploadButton onClick={onCellImageUpload} />
              ) : (
                <ImageUploadButton
                  onSelectImages={onSelectImages}
                  acceptedImageTypes={Config.getConfig().ALLOWED_IMAGE_TYPES}
                />
              )}
            </li>

            <li>
              {isCellsConversation ? (
                <CellAssetUploadButton onClick={onCellAssetUpload} />
              ) : (
                <AssetUploadButton
                  onSelectFiles={onSelectFiles}
                  acceptedFileTypes={Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS}
                />
              )}
            </li>
          </>
        )}
        <li aria-hidden="true">
          <FormatSeparator />
        </li>
        <li>
          <PingButton isDisabled={disablePing === true} onClick={onClickPing} />
        </li>
        {!isCellsConversation && (
          <li>
            <MessageTimerButton conversation={conversation} />
          </li>
        )}
      </>
    );
  }

  return (
    <>
      {showGiphyButton === true && isFilesharingEnabled && (
        <>
          {showFormatButton === true && (
            <li>
              <FormatTextButton isActive={isFormatActive} onClick={onFormatClick} />
            </li>
          )}
          {showEmojiButton === true && (
            <li>
              <EmojiButton isActive={isEmojiActive} onClick={onEmojiClick} />
            </li>
          )}
          {isFilesharingEnabled && isCellsEnabled && (
            <li>
              <CellImageUploadButton onClick={onCellImageUpload} />
            </li>
          )}
          {isFilesharingEnabled && isCellsEnabled && (
            <li>
              <CellAssetUploadButton onClick={onCellAssetUpload} />
            </li>
          )}
          <li aria-hidden="true">
            <FormatSeparator />
          </li>
          <GiphyButton onGifClick={onGifClick} />
        </>
      )}
    </>
  );
};

export {ControlButtons};
