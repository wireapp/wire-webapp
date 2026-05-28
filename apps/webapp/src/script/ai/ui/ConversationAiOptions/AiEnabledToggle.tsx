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

import {useLiveQuery} from 'dexie-react-hooks';

import {Conversation} from 'Repositories/entity/Conversation';
import {hasAi, useAi} from 'src/script/ai';
import {getEffectiveAiEnabled} from 'src/script/ai/domain/getEffectiveAiEnabled';
import {getLogger} from 'Util/logger';

const log = getLogger('AI/AiEnabledToggle');

interface AiEnabledToggleProps {
  conversation: Conversation;
}

/** Inner component — all hooks here, outer guards with hasAi() to avoid conditional hook calls. */
const AiEnabledToggleContent = ({conversation}: AiEnabledToggleProps) => {
  const {aiStorage} = useAi();
  const settings = useLiveQuery(() => aiStorage.getConversationSettings(conversation.id), [conversation.id]);
  const isEnabled = getEffectiveAiEnabled(settings, conversation);

  const handleToggle = async () => {
    try {
      await aiStorage.upsertConversationSettings({
        conversation_id: conversation.id,
        ai_enabled: !isEnabled,
        ai_description: settings?.ai_description ?? '',
      });
    } catch (error) {
      log.error('Failed to update AI enabled setting for conversation', conversation.id, error);
    }
  };

  return (
    <>
      <div className="panel__action-item panel__action-item--toggle">
        <label
          htmlFor="ai-enabled-toggle-input"
          aria-label="AI Scanning"
          className="panel__action-item-label"
          data-uie-name="do-toggle-ai-enabled"
        >
          <span className="panel__action-item__icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 12.5A5.5 5.5 0 1 1 8 2.5a5.5 5.5 0 0 1 0 11zM7 5h2v4H7V5zm0 5h2v2H7v-2z" />
            </svg>
          </span>
          <span className="panel__action-item__summary">
            <span className="panel__action-item__text">AI Scanning</span>
          </span>
        </label>

        <input
          id="ai-enabled-toggle-input"
          type="checkbox"
          className="slider-input"
          checked={isEnabled}
          onChange={() => void handleToggle()}
          data-uie-name="toggle-ai-enabled-checkbox"
        />

        <button className="button-label" type="button" aria-pressed={isEnabled} onClick={() => void handleToggle()}>
          <span className="button-label__switch" />
          <span className="visually-hidden">AI Scanning</span>
        </button>
      </div>

      <p className="panel__info-text panel__info-text--margin panel__action-item__status">
        When enabled, this conversation is included in AI scans.
      </p>
    </>
  );
};

/**
 * Toggle switch for AI scanning on a per-conversation basis.
 * Reads the current ai_enabled setting from AiStorageRepository and persists changes.
 * Follows the ReceiptModeToggle panel toggle pattern.
 */
export const AiEnabledToggle = ({conversation}: AiEnabledToggleProps) => {
  if (!hasAi()) {
    return null;
  }
  return <AiEnabledToggleContent conversation={conversation} />;
};
