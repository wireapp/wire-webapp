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

import {FormatSeparator} from 'Components/InputBar/common/FormatSeparator/FormatSeparator';
import {Conversation} from 'Repositories/entity/Conversation';
import {Config} from 'src/script/Config';

import {AssetUploadButton} from './AssetUploadButton/AssetUploadButton';
import {CancelEditButton} from './CancelEditButton/CancelEditButton';
import {CellAssetUploadButton} from './CellAssetUploadButton/CellAssetUploadButton';
import {CellImageUploadButton} from './CellImageUploadButton/CellImageUploadButton';
import {EmojiButton} from './EmojiButton/EmojiButton';
import {FormatTextButton} from './FormatTextButton/FormatTextButton';
import {GiphyButton} from './GiphyButton/GiphyButton';
import {ImageUploadButton} from './ImageUploadButton/ImageUploadButton';
import {MessageTimerButton} from './MessageTimerButton/MessageTimerButton';
import {PingButton} from './PingButton/PingButton';

export type ControlButtonsProps = {
  input: string;
  conversation: Conversation;
  disablePing?: boolean;
  disableFilesharing?: boolean;
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
};

const ControlButtons = ({
  conversation,
  disablePing,
  disableFilesharing,
  input,
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
  const isCellsEnabled = Config.getConfig().FEATURE.ENABLE_CELLS;

  if (isEditing) {
    return (
      <>
        {showFormatButton && (
          <li>
            <FormatTextButton isActive={isFormatActive} isEditing onClick={onFormatClick} />
          </li>
        )}

        {showEmojiButton && (
          <li>
            <EmojiButton isActive={isEmojiActive} isEditing onClick={onEmojiClick} />
          </li>
        )}
        {(showFormatButton || showEmojiButton) && (
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
        {!disableFilesharing && (
          <>
            <li>
              {isCellsEnabled ? (
                <CellImageUploadButton onClick={onCellImageUpload} />
              ) : (
                <ImageUploadButton
                  onSelectImages={onSelectImages}
                  acceptedImageTypes={Config.getConfig().ALLOWED_IMAGE_TYPES}
                />
              )}
            </li>

            <li>
              {isCellsEnabled ? (
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
          <PingButton isDisabled={!!disablePing} onClick={onClickPing} />
        </li>
        {!isCellsEnabled && (
          <li>
            <MessageTimerButton conversation={conversation} />
          </li>
        )}
      </>
    );
  }

  return (
    <>
      {showGiphyButton && !disableFilesharing && (
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
          {!disableFilesharing && isCellsEnabled && (
            <li>
              <CellImageUploadButton onClick={onCellImageUpload} />
            </li>
          )}
          {!disableFilesharing && isCellsEnabled && (
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
