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

import React from 'react';

import {Icon} from 'Components/Icon';
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
  showGiphyButton?: boolean;
  onClickPing: () => void;
  onSelectFiles: (files: File[]) => void;
  onSelectImages: (files: File[]) => void;
  onCancelEditing: () => void;
  onGifClick: () => void;
};

const ControlButtons: React.FC<ControlButtonsProps> = ({
  conversation,
  disablePing,
  disableFilesharing,
  input,
  isEditing,
  isScaledDown,
  showGiphyButton,
  onClickPing,
  onSelectFiles,
  onSelectImages,
  onCancelEditing,
  onGifClick,
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
          <Icon.Close />
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
            className={`controls-right-button buttons-group-button-left ${scaledDownClass}`}
            type="button"
            onClick={onClickPing}
            disabled={disablePing}
            title={pingTooltip}
            aria-label={pingTooltip}
            data-uie-name="do-ping"
          >
            <Icon.Ping />
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
          <MessageTimerButton conversation={conversation} />
        </li>
      </>
    );
  }

  return <>{showGiphyButton && !disableFilesharing && <GiphyButton onGifClick={onGifClick} />}</>;
};

export {ControlButtons};
