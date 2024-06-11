/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

interface MessageContentProps {
  messageHtml?: string;
  message?: React.ReactNode;
}

const isStringMessage = (message: unknown): message is string => typeof message === 'string';

export const MessageContent = ({message, messageHtml}: MessageContentProps) => {
  if (!message && !messageHtml) {
    return null;
  }

  return (
    <div className="modal__text" data-uie-name="status-modal-text">
      {messageHtml && <p id="modal-description-html" dangerouslySetInnerHTML={{__html: messageHtml}} />}
      {message && <div id="modal-description-text">{isStringMessage(message) ? <p>{message}</p> : message}</div>}
    </div>
  );
};
