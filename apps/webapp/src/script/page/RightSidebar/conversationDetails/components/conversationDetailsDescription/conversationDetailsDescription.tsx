/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {FC, KeyboardEvent, useEffect, useRef, useState} from 'react';

import * as Icon from 'Components/icon';
import {isEnterKey} from 'Util/keyboardUtil';
import {t} from 'Util/localizerUtil';

const MAX_DESCRIPTION_LENGTH = 200;

interface ConversationDetailsDescriptionProps {
  description?: string;
  onDescriptionChange: (description: string) => void;
}

const ConversationDetailsDescription: FC<ConversationDetailsDescriptionProps> = ({
  description = '',
  onDescriptionChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [draftValue, setDraftValue] = useState(description);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraftValue(description);
  }, [description]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const startEditing = () => {
    setDraftValue(description);
    setIsEditing(true);
  };

  const saveDescription = () => {
    setIsEditing(false);
    const trimmed = draftValue.trim();

    if (trimmed !== description) {
      onDescriptionChange(trimmed);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isEnterKey(event)) {
      event.preventDefault();
      saveDescription();
    }
  };

  const hasDescription = description.length > 0;

  return (
    <div
      className="conversation-details__description"
      data-uie-name="conversation-details-description"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="conversation-details__description-label">
        <h3 className="conversation-details__description-heading">{t('conversationDetailsDescription')}</h3>
        {isHovered && !isEditing && hasDescription && (
          <button
            type="button"
            className="conversation-details__description-edit-button"
            data-uie-name="description-edit-icon"
            onClick={startEditing}
          >
            <Icon.EditIcon className="conversation-details__description-edit-icon" />
          </button>
        )}
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="conversation-details__description-input"
          data-uie-name="description-textarea"
          value={draftValue}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={event => setDraftValue(event.target.value)}
          onBlur={saveDescription}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button
          type="button"
          className="conversation-details__description-content"
          onClick={startEditing}
          data-uie-name="description-content"
        >
          {hasDescription ? (
            <p className="conversation-details__description-text">{description}</p>
          ) : (
            <p className="conversation-details__description-placeholder">
              {t('conversationDetailsDescriptionPlaceholder')}
            </p>
          )}
        </button>
      )}
    </div>
  );
};

export {ConversationDetailsDescription};
