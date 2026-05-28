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

import {useState, useEffect} from 'react';

import {useLiveQuery} from 'dexie-react-hooks';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {Conversation} from 'Repositories/entity/Conversation';
import {useAi} from 'src/script/ai';
import {PanelHeader} from 'src/script/page/RightSidebar/panelHeader';
import {getLogger} from 'Util/logger';

const log = getLogger('AI/AiDescriptionPanel');

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const infoStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#9ca3af',
  marginBottom: '12px',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '150px',
  padding: '10px',
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '6px',
  color: '#f3f4f6',
  fontSize: '0.875rem',
  resize: 'vertical',
  fontFamily: 'inherit',
};

const saveButtonStyle: React.CSSProperties = {
  marginTop: '12px',
  padding: '8px 16px',
  backgroundColor: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.875rem',
};

interface AiDescriptionPanelProps {
  conversation: Conversation;
  onClose?: () => void;
  onGoBack?: () => void;
}

/**
 * Right-sidebar panel for editing the AI context description of a conversation.
 * The description is injected into the LLM prompt during scanning.
 */
export const AiDescriptionPanel = ({conversation, onClose, onGoBack}: AiDescriptionPanelProps) => {
  const {aiStorage} = useAi();
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const settings = useLiveQuery(() => aiStorage.getConversationSettings(conversation.id), [conversation.id]);

  useEffect(() => {
    setDescription(settings?.ai_description ?? '');
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await aiStorage.upsertConversationSettings({
        conversation_id: conversation.id,
        ai_enabled: settings?.ai_enabled ?? true,
        ai_description: description,
      });
    } catch (error) {
      log.error('Failed to save AI description for conversation', conversation.id, error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={panelStyle}>
      <PanelHeader onClose={onClose ?? (() => {})} onGoBack={onGoBack} showBackArrow={!!onGoBack} title="AI Context" />
      <FadingScrollbar style={{padding: '16px', flex: 1}}>
        <div style={infoStyle}>
          Describe the purpose of this conversation to help the AI understand the context better. This text is included
          in the prompt during scanning.
        </div>

        <textarea
          style={textareaStyle}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. This is the team's project planning channel for the mobile app redesign..."
          aria-label="AI description for this conversation"
        />

        <button style={saveButtonStyle} onClick={() => void handleSave()} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </FadingScrollbar>
    </div>
  );
};
