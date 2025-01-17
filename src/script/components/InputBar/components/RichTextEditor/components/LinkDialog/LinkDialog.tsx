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

import {ChangeEvent, useEffect, useRef, useState} from 'react';

import {css} from '@emotion/react';

import {Input} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';

interface LinkDialogProps {
  onSubmit: (url: string, text?: string) => void;
  onClose: () => void;
  initialUrl?: string;
  initialText?: string;
  showTextInput?: boolean;
  isShown: boolean;
  title: string;
}

const formStyles = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
`;

const inputWrapperStyles = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const labelStyles = css`
  color: var(--main-color);
  font-size: 14px;
`;

const inputStyles = css`
  background: var(--app-bg);
  border: 1px solid var(--foreground);
  border-radius: 4px;
  color: var(--main-color);
  padding: 8px;
  width: 100%;
`;

const buttonGroupStyles = css`
  display: flex;
  gap: 16px;
  justify-content: flex-end;
`;

const buttonStyles = css`
  background: var(--accent-color);
  border: none;
  border-radius: 4px;
  color: var(--app-bg);
  cursor: pointer;
  padding: 8px 16px;

  &:hover {
    background: var(--accent-color-500);
  }
`;

const cancelButtonStyles = css`
  ${buttonStyles};
  background: var(--background);
  color: var(--main-color);

  &:hover {
    background: var(--background-fade-16);
  }
`;

const titleStyles = css`
  border-bottom: 1px solid var(--foreground);
  color: var(--main-color);
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  padding: 16px 24px;
`;

export const LinkDialog = ({
  onSubmit,
  onClose,
  initialUrl = '',
  initialText = '',
  showTextInput = true,
  isShown,
  title,
}: LinkDialogProps) => {
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isShown) {
      setTimeout(() => urlInputRef.current?.focus(), 100);
    }
  }, [isShown]);

  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (url) {
      onSubmit(url, text);
    }
  };

  return (
    <ModalComponent isShown={isShown} onBgClick={onClose}>
      <div className="modal__header" data-uie-name="status-modal-title">
        <h2 className="modal__header__title" id="modal-title">
          {title}
        </h2>
        <button
          type="button"
          className="modal__header__button"
          onClick={onClose}
          aria-label="Close"
          data-uie-name="do-close"
        >
          <Icon.CloseIcon className="modal__header__icon" aria-hidden="true" />
        </button>
      </div>
      <form css={formStyles} onSubmit={handleSubmit}>
        {showTextInput && (
          <div css={inputWrapperStyles}>
            <Input
              id="link-text"
              type="text"
              label="Text"
              value={text || initialText}
              placeholder="Text"
              required
              markInvalid={text !== ''}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setText(event.target.value);
              }}
            />
          </div>
        )}

        <div css={inputWrapperStyles}>
          <Input
            id="link-text"
            type="text"
            label="URL"
            value={url || initialUrl}
            placeholder="Enter URL"
            required
            markInvalid={url !== ''}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setUrl(event.target.value);
            }}
          />
        </div>
        <div css={buttonGroupStyles}>
          <button type="button" css={cancelButtonStyles} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" css={buttonStyles}>
            {showTextInput ? 'Add Link' : 'Update Link'}
          </button>
        </div>
      </form>
    </ModalComponent>
  );
};
