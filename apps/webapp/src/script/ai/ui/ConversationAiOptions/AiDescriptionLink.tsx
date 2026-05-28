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

import {Conversation} from 'Repositories/entity/Conversation';
import {PanelEntity, PanelState} from 'src/script/page/RightSidebar/RightSidebar';

interface AiDescriptionLinkProps {
  conversation: Conversation;
  togglePanel: (state: PanelState, entity: PanelEntity) => void;
}

/**
 * Panel-link button that opens the AI description side panel.
 * Follows the openTimedMessagePanel / openGuestPanel pattern in conversationDetailsOptions.
 */
export const AiDescriptionLink = ({conversation, togglePanel}: AiDescriptionLinkProps) => {
  const openAiDescriptionPanel = () => togglePanel(PanelState.AI_DESCRIPTION, conversation);

  return (
    <li className="conversation-details__ai-description">
      <button
        className="panel__action-item"
        data-uie-name="go-ai-description"
        onClick={openAiDescriptionPanel}
        type="button"
      >
        <span className="panel__action-item__icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h12v1H2V2zm0 3h12v1H2V5zm0 3h8v1H2V8zm0 3h10v1H2v-1z" />
          </svg>
        </span>
        <span className="panel__action-item__summary">
          <span className="panel__action-item__text">AI Context</span>
          <span className="panel__action-item__status">Add description for AI scanning</span>
        </span>
        <span className="panel__action-item__chevron">›</span>
      </button>
    </li>
  );
};
