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

import Icon from 'Components/Icon';
import cx from 'classnames';
import React, {useRef} from 'react';
import MessageTimerButton from '../MessageTimerButton';
import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {Conversation} from 'src/script/entity/Conversation';
import {Config} from '../../../Config';

const config = {
  GIPHY_TEXT_LENGTH: 256,
};
type InputBarControlsProps = {
  input: string;
  conversation: Conversation;
  disablePing?: boolean;
  disableFilesharing?: boolean;
  isEditing?: boolean;
  onClickPing: () => void;
  onSelectFiles: (files: File[]) => void;
  onSelectImages: (files: File[]) => void;
  onCancelEditing: () => void;
  onClickGif: () => void;
  onSend: () => void;
};

const InputBarControls: React.FC<InputBarControlsProps> = ({
  input,
  conversation,
  disablePing: pingDisabled,
  isEditing,
  disableFilesharing,
  onClickPing,
  onSelectFiles,
  onSelectImages,
  onCancelEditing,
  onClickGif,
  onSend,
}) => {
  const acceptedImageTypes = Config.getConfig().ALLOWED_IMAGE_TYPES.join(',');
  const acceptedFileTypes = Config.getConfig().FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS.join(',');

  const imageRef = useRef<HTMLInputElement>(null!);
  const fileRef = useRef<HTMLInputElement>(null!);

  const pingTooltip = t('tooltipConversationPing');

  let buttons;
  if (isEditing) {
    buttons = (
      <li>
        <button
          type="button"
          className="controls-right-button button-icon-large"
          onClick={onCancelEditing}
          data-uie-name="do-cancel-edit"
        >
          <Icon.Close />
        </button>
      </li>
    );
  } else if (input.length === 0) {
    buttons = (
      <>
        {!disableFilesharing && (
          <>
            <li>
              <button
                className="controls-right-button button-icon-large buttons-group-button-left"
                type="button"
                onClick={onClickPing}
                disabled={pingDisabled}
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
                className="conversation-button controls-right-button no-radius button-icon-large"
                onClick={() => imageRef.current?.click()}
              >
                <Icon.Image />
                <input
                  ref={imageRef}
                  accept={acceptedImageTypes}
                  tabIndex={-1}
                  id="conversation-input-bar-photo"
                  onChange={event => onSelectImages(Array.from(event.target.files))}
                  type="file"
                  data-uie-name="do-share-image"
                />
              </button>
            </li>

            <li>
              <button
                type="button"
                aria-label={t('tooltipConversationFile')}
                title={t('tooltipConversationFile')}
                className="conversation-button controls-right-button no-radius button-icon-large"
                onClick={() => fileRef.current?.click()}
              >
                <Icon.Attachment />
                <input
                  ref={fileRef}
                  accept={acceptedFileTypes ?? null}
                  id="conversation-input-bar-files"
                  tabIndex={-1}
                  onChange={event => onSelectFiles(Array.from(event.target.files))}
                  type="file"
                  data-uie-name="do-share-file"
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
  } else {
    const showGiphyButton = input.length <= config.GIPHY_TEXT_LENGTH;

    buttons = (
      <>
        {showGiphyButton && !disableFilesharing && (
          <li>
            <button
              type="button"
              className="controls-right-button button-icon-large"
              title={t('extensionsBubbleButtonGif')}
              aria-label={t('extensionsBubbleButtonGif')}
              onClick={onClickGif}
              data-uie-name="do-giphy-popover"
            >
              <Icon.Gif />
            </button>
          </li>
        )}
      </>
    );
  }

  return (
    <ul className="controls-right buttons-group">
      {buttons}
      <li>
        <button
          type="button"
          className={cx('controls-right-button controls-right-button--send')}
          disabled={input.length === 0}
          title={t('tooltipConversationSendMessage')}
          aria-label={t('tooltipConversationSendMessage')}
          onClick={onSend}
          data-uie-name="do-send-message"
        >
          <Icon.Send />
        </button>
      </li>
    </ul>
  );
};

export default InputBarControls;

registerReactComponent('input-bar-controls', InputBarControls);
