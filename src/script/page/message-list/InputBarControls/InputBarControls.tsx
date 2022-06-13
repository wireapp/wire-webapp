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
import React from 'react';
import MessageTimerButton from '../MessageTimerButton';
import {registerReactComponent} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

const config = {
  GIPHY_TEXT_LENGTH: 256,
};
type InputBarControlsProps = {
  input: string;
};

const InputBarControls: React.FC<InputBarControlsProps> = ({input}) => {
  const isEditing = false;
  const showGiphyButton = input.length > 0 && input.length <= config.GIPHY_TEXT_LENGTH;
  const isFileSharingSendingEnabled = true;

  let buttons;
  if (isEditing) {
    buttons = (
      <li>
        <button
          type="button"
          className="controls-right-button button-icon-large"
          data-bind="click: cancelMessageEditing"
          data-uie-name="do-cancel-edit"
        >
          <span aria-hidden="true">
            <Icon.Close />
          </span>
        </button>
      </li>
    );
  } else if (input.length === 0) {
    buttons = (
      <>
        {isFileSharingSendingEnabled && (
          <>
            <li>
              <button
                className="controls-right-button button-icon-large buttons-group-button-left"
                type="button"
                data-bind="click: clickToPing, disabled: pingDisabled(), attr: {'title': pingTooltip, 'aria-label': pingTooltip}, css: {'disabled': pingDisabled()}"
                data-uie-name="do-ping"
              >
                <Icon.Ping />
              </button>
            </li>

            <li>
              <button type="button" aria-label={t('tooltipConversationAddImage')} className="conversation-button">
                <label
                  htmlFor="conversation-input-bar-photo"
                  className="controls-right-button no-radius button-icon-large"
                >
                  <Icon.Image />
                  <input
                    tabIndex={-1}
                    id="conversation-input-bar-photo"
                    data-bind="attr: {accept: acceptedImageTypes}, file_select: uploadImages"
                    type="file"
                    multiple="multiple"
                    data-uie-name="do-share-image"
                  />
                </label>
              </button>
            </li>

            <li>
              <button type="button" aria-label={t('tooltipConversationFile')} className="conversation-button">
                <label
                  htmlFor="conversation-input-bar-files"
                  className="controls-right-button no-radius button-icon-large"
                >
                  <Icon.Attachment />
                  <input
                    id="conversation-input-bar-files"
                    data-bind="attr: inputFileAttr, file_select: uploadFiles"
                    tabIndex={-1}
                    type="file"
                    multiple="multiple"
                    data-uie-name="do-share-file"
                  />
                </label>
              </button>
            </li>
          </>
        )}
        <li>
          <MessageTimerButton conversation={undefined} />
        </li>
      </>
    );
  } else {
    buttons = (
      <>
        {showGiphyButton && isFileSharingSendingEnabled && (
          <li>
            <button
              type="button"
              className="controls-right-button button-icon-large"
              title={t('extensionsBubbleButtonGif')}
              aria-label={t('extensionsBubbleButtonGif')}
              data-bind="click: clickToShowGiphy"
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
          className="controls-right-button controls-right-button--send"
          data-bind="click: onInputEnter, disable: input().length === 0, css: {'active': input().length !== 0}, attr: {'title': t('tooltipConversationSendMessage'), 'aria-label': t('tooltipConversationSendMessage')}"
          data-uie-name="do-send-message"
        >
          <span aria-hidden="true">
            <Icon.Send />
          </span>
        </button>
      </li>
    </ul>
  );
};

export default InputBarControls;

registerReactComponent('input-bar-controls', InputBarControls);
