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

import React, {useRef} from 'react';

import Icon from 'Components/Icon';
import {Conversation} from 'src/script/entity/Conversation';
import {t} from 'Util/LocalizerUtil';

import GiphyButton from './GiphyButton';

import {Config} from '../../../Config';
import MessageTimerButton from '../MessageTimerButton';

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
  const acceptedImageTypes = Config.getConfig().ALLOWED_IMAGE_TYPES.join(',');
  const acceptedFileTypes = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS.join(',');

  const imageRef = useRef<HTMLInputElement>(null!);
  const fileRef = useRef<HTMLInputElement>(null!);

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
        {!disableFilesharing && (
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

            <li>
              <button
                type="button"
                aria-label={t('tooltipConversationAddImage')}
                title={t('tooltipConversationAddImage')}
                className={`conversation-button controls-right-button no-radius file-button`}
                onClick={() => imageRef.current?.click()}
                data-uie-name="do-share-image"
              >
                <Icon.Image />

                <input
                  ref={imageRef}
                  accept={acceptedImageTypes}
                  tabIndex={-1}
                  id="conversation-input-bar-photo"
                  onChange={({target: {files}}) => files && onSelectImages(Array.from(files))}
                  type="file"
                />
              </button>
            </li>

            <li>
              <button
                type="button"
                aria-label={t('tooltipConversationFile')}
                title={t('tooltipConversationFile')}
                className={`conversation-button controls-right-button no-radius file-button`}
                onClick={() => fileRef.current?.click()}
                data-uie-name="do-share-file"
              >
                <Icon.Attachment />

                <input
                  ref={fileRef}
                  accept={acceptedFileTypes ?? null}
                  id="conversation-input-bar-files"
                  tabIndex={-1}
                  onChange={({target: {files}}) => files && onSelectFiles(Array.from(files))}
                  type="file"
                />
              </button>
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

export default ControlButtons;
