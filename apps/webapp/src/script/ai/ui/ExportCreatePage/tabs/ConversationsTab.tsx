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

import {useAi} from 'src/script/ai';

import {itemRowStyle, itemRowSelectedStyle, checkboxStyle, itemTitleStyle, itemDescStyle, emptyStyle} from '../ExportCreatePage.styles';

export interface ConversationItem {
  id: string;
  name: string;
  ai_enabled: boolean;
}

interface ConversationsTabProps {
  all_conversations: ConversationItem[];
  selected_ids: Set<string>;
  on_toggle: (id: string) => void;
}

/**
 * Tab 1: all conversations in the app.
 * AI-enabled conversations at top; AI-ignored at bottom in greyscale (still selectable).
 */
export const ConversationsTab = ({all_conversations, selected_ids, on_toggle}: ConversationsTabProps) => {
  const {aiStorage} = useAi();
  const settings_list = useLiveQuery(() => aiStorage.listAllConversationSettings(), []) ?? [];
  const settings_map = new Map(settings_list.map(s => [s.conversation_id, s]));

  // A conversation is "ignored" only when there is an explicit settings record
  // with ai_enabled === false. No record means the conversation was never configured
  // and should be treated as normal (not greyed).
  const is_ignored = (conv_id: string): boolean => {
    const settings = settings_map.get(conv_id);
    return settings !== undefined && settings.ai_enabled === false;
  };

  const sorted = [
    ...all_conversations.filter(c => !is_ignored(c.id)),
    ...all_conversations.filter(c => is_ignored(c.id)),
  ];

  if (sorted.length === 0) {
    return <div style={emptyStyle}>No conversations found.</div>;
  }

  return (
    <div>
      {sorted.map(conv => {
        const selected = selected_ids.has(conv.id);
        const ignored = is_ignored(conv.id);

        return (
          <div
            key={conv.id}
            style={{
              ...itemRowStyle,
              ...(selected ? itemRowSelectedStyle : {}),
              opacity: ignored ? 0.45 : 1,
              filter: ignored ? 'grayscale(0.7)' : 'none',
            }}
            onClick={() => on_toggle(conv.id)}
            role="checkbox"
            aria-checked={selected}
            tabIndex={0}
            onKeyDown={e => e.key === ' ' && on_toggle(conv.id)}
          >
            <input
              type="checkbox"
              style={checkboxStyle}
              checked={selected}
              onChange={() => on_toggle(conv.id)}
              onClick={e => e.stopPropagation()}
            />
            <div>
              <div style={itemTitleStyle}>{conv.name || '(Unnamed conversation)'}</div>
              {ignored && <div style={itemDescStyle}>AI features disabled for this conversation</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
