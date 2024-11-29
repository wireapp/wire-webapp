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

import {EmojiIcon} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {Config} from 'src/script/Config';
import {Conversation} from 'src/script/entity/Conversation';
import {t} from 'Util/LocalizerUtil';

import {GiphyButton} from './GiphyButton';

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
  const pingTooltip = t('tooltipConversationPing');

  if (isEditing) {
    return (
      <li>
        <button
          type="button"
          className="controls-right-button button-icon-large"
          onClick={onCancelEditing}
          data-uie-name="do-cancel-edit"
          aria-label={t('accessibility.cancelMsgEdit')}
        >
          <Icon.CloseIcon />
        </button>
      </li>
    );
  }

  if (input.length === 0 || isScaledDown) {
    const scaledDownClass = isScaledDown && 'controls-right-button_responsive';

    return (
      <>
        <li>
          <button
            className={`controls-right-button buttons-group-button-left ${scaledDownClass} ${isFormatActive ? 'active' : ''}`}
            type="button"
            onClick={onFormatClick}
            title="rich text"
            aria-label="rich text"
            data-uie-name="format-text"
          >
            <Icon.MarkdownIcon />
          </button>
        </li>

        <li>
          <button
            className={`controls-right-button no-radius ${scaledDownClass} ${isEmojiActive ? 'active' : ''}`}
            type="button"
            onClick={onEmojiClick}
            title="rich text"
            aria-label="rich text"
            data-uie-name="format-text"
          >
            <EmojiIcon />
          </button>
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
          <button
            className={`conversation-button controls-right-button no-radius ${scaledDownClass}`}
            type="button"
            onClick={onClickPing}
            disabled={disablePing}
            title={pingTooltip}
            aria-label={pingTooltip}
            data-uie-name="do-ping"
          >
            <Icon.PingIcon />
          </button>
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
            <button
              className={`controls-right-button buttons-group-button-left ${isFormatActive ? 'active' : ''}`}
              type="button"
              onClick={onFormatClick}
              title="rich text"
              aria-label="rich text"
              data-uie-name="format-text"
            >
              <Icon.MarkdownIcon />
            </button>
          </li>

          <li>
            <button
              className={`controls-right-button no-radius ${isEmojiActive ? 'active' : ''}`}
              type="button"
              onClick={onEmojiClick}
              title="rich text"
              aria-label="rich text"
              data-uie-name="format-text"
            >
              <EmojiIcon />
            </button>
          </li>
          <GiphyButton onGifClick={onGifClick} />
        </>
      )}
    </>
  );
};

export {ControlButtons};
