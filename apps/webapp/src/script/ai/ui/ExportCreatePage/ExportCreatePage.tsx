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

import React, {useEffect, useState} from 'react';

import {format} from 'date-fns';
import {useLiveQuery} from 'dexie-react-hooks';
import {container} from 'tsyringe';

import {useAi} from 'src/script/ai';
import type {AiFinalReportEntryRecord, AiEntryNoteRecord, JiraTicketRecord} from 'src/script/ai/storage/records';
import {buildTranscriptLines, transcriptLinesToString} from 'src/script/ai/transcript/buildTranscript';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {UserState} from 'Repositories/user/UserState';
import {navigate} from 'src/script/router/Router';
import {generateExportsListUrl, generateExportResultUrl} from 'src/script/router/routeGenerator';
import {useAppState} from 'src/script/page/useAppState';

import {AnalysisTab} from './tabs/AnalysisTab';
import {ConversationsTab, type ConversationItem} from './tabs/ConversationsTab';
import {JiraTicketsTab} from './tabs/JiraTicketsTab';
import {TicketProposalsTab} from './tabs/TicketProposalsTab';
import {TodosTab} from './tabs/TodosTab';

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#17181a',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid #34373d',
  flexShrink: 0,
};

const backButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#60a5fa',
  cursor: 'pointer',
  padding: '0',
  fontSize: '0.82rem',
  marginBottom: '10px',
  display: 'block',
};

const nameInputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1e2023',
  border: '1px solid #34373d',
  borderRadius: '6px',
  color: '#dce0e3',
  fontSize: '1.1rem',
  fontWeight: 700,
  padding: '8px 12px',
  outline: 'none',
  boxSizing: 'border-box',
};

const tabListStyle: React.CSSProperties = {
  display: 'flex',
  gap: '2px',
  borderBottom: '1px solid #34373d',
  padding: '0 24px',
  flexShrink: 0,
};

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '10px 16px',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
  color: active ? '#60a5fa' : '#9ca3af',
  cursor: 'pointer',
  fontWeight: active ? 600 : 400,
  fontSize: '0.85rem',
  marginBottom: '-1px',
  whiteSpace: 'nowrap',
});

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 24px',
  paddingBottom: '80px',
};

const footerStyle: React.CSSProperties = {
  position: 'sticky',
  bottom: 0,
  background: '#17181a',
  borderTop: '1px solid #34373d',
  padding: '12px 24px',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  flexShrink: 0,
};

const exportButtonStyle: React.CSSProperties = {
  padding: '8px 24px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
};

const selectionCountStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#676b71',
  alignSelf: 'center',
};

// ─── Tab definitions ─────────────────────────────────────────────────────────

type TabId = 'conversations' | 'jira' | 'analysis' | 'todos' | 'tickets';

const TABS: {id: TabId; label: string}[] = [
  {id: 'conversations', label: 'Conversations'},
  {id: 'jira',          label: 'Jira Tickets'},
  {id: 'analysis',      label: 'Analysis'},
  {id: 'todos',         label: 'Todos'},
  {id: 'tickets',       label: 'Ticket Proposals'},
];

// ─── Markdown generation ─────────────────────────────────────────────────────

const generate_markdown = ({
  export_name,
  selected_conversations,
  conversation_transcripts,
  selected_jira_tickets,
  selected_analysis,
  selected_todos,
  selected_ticket_proposals,
  notes_by_entry_id,
}: {
  export_name: string;
  selected_conversations: ConversationItem[];
  conversation_transcripts: Map<string, string>;
  selected_jira_tickets: JiraTicketRecord[];
  selected_analysis: AiFinalReportEntryRecord[];
  selected_todos: AiFinalReportEntryRecord[];
  selected_ticket_proposals: AiFinalReportEntryRecord[];
  notes_by_entry_id: Map<string, AiEntryNoteRecord>;
}): string => {
  const lines: string[] = [];

  const append_note = (entry_id: string) => {
    const note = notes_by_entry_id.get(entry_id);
    if (note?.text) {
      lines.push('');
      lines.push(`> **Note:** ${note.text}`);
    }
  };

  lines.push(`# ${export_name || 'Untitled Export'}`);
  lines.push('');

  if (selected_conversations.length > 0) {
    lines.push('## Conversations');
    lines.push('');
    for (const conv of selected_conversations) {
      lines.push(`### ${conv.name || '(Unnamed conversation)'}`);
      lines.push('');
      const transcript = conversation_transcripts.get(conv.id);
      if (transcript) {
        lines.push(transcript);
      } else {
        lines.push('*No messages found.*');
      }
      lines.push('');
    }
  }

  if (selected_jira_tickets.length > 0) {
    lines.push('## Jira Tickets');
    lines.push('');
    for (const ticket of selected_jira_tickets) {
      lines.push(`### ${ticket.key}: ${ticket.summary}`);
      lines.push('');
      lines.push(`**Status:** ${ticket.status_name}`);
      if (ticket.priority_name) {
        lines.push(`**Priority:** ${ticket.priority_name}`);
      }
      if (ticket.story_points !== null) {
        lines.push(`**Story Points:** ${ticket.story_points}`);
      }
      lines.push('');
    }
  }

  if (selected_analysis.length > 0) {
    lines.push('## Analysis');
    lines.push('');
    for (const entry of selected_analysis) {
      if (entry.payload.type === 'report') {
        const title = `${format(new Date(entry.payload.start), 'PP')} – ${format(new Date(entry.payload.end), 'PP')}`;
        lines.push(`### ${title}`);
        lines.push('');
        lines.push(entry.payload.description);
        append_note(entry.id);
        lines.push('');
      }
    }
  }

  if (selected_todos.length > 0) {
    lines.push('## Todos');
    lines.push('');
    for (const entry of selected_todos) {
      if (entry.payload.type === 'todo') {
        lines.push(`### ${entry.payload.title}`);
        lines.push('');
        lines.push(entry.payload.description);
        append_note(entry.id);
        lines.push('');
      }
    }
  }

  if (selected_ticket_proposals.length > 0) {
    lines.push('## Ticket Proposals');
    lines.push('');
    for (const entry of selected_ticket_proposals) {
      if (entry.payload.type === 'ticket') {
        const title = entry.mutable_state.title ?? entry.payload.title;
        const description = entry.mutable_state.description ?? entry.payload.description;
        lines.push(`### ${title}`);
        lines.push('');
        lines.push(description);
        append_note(entry.id);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Create/edit an export. Name + 5 selection tabs. On Export: saves record + markdown,
 * navigates to ExportResultPage.
 */
export const ExportCreatePage = () => {
  const {aiStorage, jiraStorage} = useAi();
  const active_export_id = useAppState(s => s.activeExportId);
  const conversationState = container.resolve(ConversationState);
  const userState = container.resolve(UserState);

  const [name, setName] = useState('');
  const [active_tab, setActiveTab] = useState<TabId>('conversations');
  const [selected_conversation_ids, setSelectedConversationIds] = useState(new Set<string>());
  const [selected_jira_keys, setSelectedJiraKeys] = useState(new Set<string>());
  const [selected_analysis_ids, setSelectedAnalysisIds] = useState(new Set<string>());
  const [selected_todo_ids, setSelectedTodoIds] = useState(new Set<string>());
  const [selected_ticket_ids, setSelectedTicketIds] = useState(new Set<string>());
  const [all_conversations, setAllConversations] = useState<ConversationItem[]>([]);

  // Load conversations from ConversationState on mount
  useEffect(() => {
    const convs = conversationState.conversations();
    const items: ConversationItem[] = convs.map(conv => ({
      id: conv.id,
      name: conv.display_name(),
      ai_enabled: false,
    }));
    setAllConversations(items);
  }, []);

  // Load existing export selections if editing
  useEffect(() => {
    if (!active_export_id) {
      return;
    }
    void aiStorage.getExport(active_export_id).then(record => {
      if (!record) {
        return;
      }
      setName(record.name);
      setSelectedConversationIds(new Set(record.selected_conversation_ids));
      setSelectedJiraKeys(new Set(record.selected_jira_ticket_keys));
      setSelectedAnalysisIds(new Set(record.selected_analysis_entry_ids));
      setSelectedTodoIds(new Set(record.selected_todo_entry_ids));
      setSelectedTicketIds(new Set(record.selected_ticket_entry_ids));
    });
  }, [active_export_id]);

  // Load latest finished report's entries for analysis/todos/tickets tabs
  const latest_report_id = useLiveQuery(async () => {
    const reports = await aiStorage.listReports();
    const finished = reports.find(r => r.final_pass_finished_at !== null);
    return finished?.id ?? null;
  }, []);

  const report_entries = useLiveQuery(
    () => (latest_report_id ? aiStorage.listFinalEntries(latest_report_id) : Promise.resolve([])),
    [latest_report_id],
  ) ?? [];

  // Live Jira tickets for markdown generation (we need the full records, not just keys)
  const all_jira_tickets = useLiveQuery(() => jiraStorage.getAllTickets(), []) ?? [];

  const toggle = (set_state: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string) => {
    set_state(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const total_selected =
    selected_conversation_ids.size +
    selected_jira_keys.size +
    selected_analysis_ids.size +
    selected_todo_ids.size +
    selected_ticket_ids.size;

  const handle_export = async () => {
    const selected_conversations = all_conversations.filter(c => selected_conversation_ids.has(c.id));
    const selected_jira_tickets = all_jira_tickets.filter(t => selected_jira_keys.has(t.key));
    const selected_analysis = report_entries.filter(e => selected_analysis_ids.has(e.id));
    const selected_todos = report_entries.filter(e => selected_todo_ids.has(e.id));
    const selected_ticket_proposals = report_entries.filter(e => selected_ticket_ids.has(e.id));

    // Build actual message transcripts for each selected conversation
    const conversation_transcripts = new Map<string, string>();
    const self = userState.self();
    const self_user_info = self?.id
      ? {id: self.id, name: self.name(), handle: self.username()}
      : undefined;
    const all_conv_entities = conversationState.conversations();

    for (const conv of selected_conversations) {
      const events = await aiStorage.getEventsForConversation(conv.id);
      const conv_entity = all_conv_entities.find(c => c.id === conv.id);
      if (conv_entity) {
        const lines = buildTranscriptLines(conv_entity, events, self_user_info);
        const text = transcriptLinesToString(lines);
        if (text) {
          conversation_transcripts.set(conv.id, text);
        }
      }
    }

    const all_selected_entry_ids = [
      ...selected_analysis.map(e => e.id),
      ...selected_todos.map(e => e.id),
      ...selected_ticket_proposals.map(e => e.id),
    ];

    const notes_list = await aiStorage.listNotesForEntries(all_selected_entry_ids);
    const notes_by_entry_id = new Map(notes_list.map(n => [n.entry_id, n]));

    const markdown = generate_markdown({
      export_name: name,
      selected_conversations,
      conversation_transcripts,
      selected_jira_tickets,
      selected_analysis,
      selected_todos,
      selected_ticket_proposals,
      notes_by_entry_id,
    });

    const seed = {
      name,
      selected_conversation_ids: [...selected_conversation_ids],
      selected_jira_ticket_keys: [...selected_jira_keys],
      selected_analysis_entry_ids: [...selected_analysis_ids],
      selected_todo_entry_ids: [...selected_todo_ids],
      selected_ticket_entry_ids: [...selected_ticket_ids],
      markdown,
    };

    let export_id: string;

    if (active_export_id) {
      await aiStorage.updateExport(active_export_id, seed);
      export_id = active_export_id;
    } else {
      const record = await aiStorage.createExport(seed);
      export_id = record.id;
    }

    navigate(generateExportResultUrl(export_id));
  };

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button style={backButtonStyle} onClick={() => navigate(generateExportsListUrl())}>
          ← Back to Exports
        </button>
        <input
          style={nameInputStyle}
          type="text"
          placeholder="Export name…"
          value={name}
          onChange={e => setName(e.target.value)}
          aria-label="Export name"
        />
      </div>

      <div style={tabListStyle} role="tablist">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active_tab === tab.id}
            style={tabButtonStyle(active_tab === tab.id)}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" style={bodyStyle}>
        {active_tab === 'conversations' && (
          <ConversationsTab
            all_conversations={all_conversations}
            selected_ids={selected_conversation_ids}
            on_toggle={toggle(setSelectedConversationIds)}
          />
        )}
        {active_tab === 'jira' && (
          <JiraTicketsTab
            selected_keys={selected_jira_keys}
            on_toggle={toggle(setSelectedJiraKeys)}
          />
        )}
        {active_tab === 'analysis' && (
          <AnalysisTab
            entries={report_entries}
            selected_ids={selected_analysis_ids}
            on_toggle={toggle(setSelectedAnalysisIds)}
          />
        )}
        {active_tab === 'todos' && (
          <TodosTab
            entries={report_entries}
            selected_ids={selected_todo_ids}
            on_toggle={toggle(setSelectedTodoIds)}
          />
        )}
        {active_tab === 'tickets' && (
          <TicketProposalsTab
            entries={report_entries}
            selected_ids={selected_ticket_ids}
            on_toggle={toggle(setSelectedTicketIds)}
          />
        )}
      </div>

      <div style={footerStyle}>
        {total_selected > 0 && (
          <span style={selectionCountStyle}>{total_selected} item{total_selected !== 1 ? 's' : ''} selected</span>
        )}
        <button style={exportButtonStyle} onClick={() => void handle_export()}>
          Export
        </button>
      </div>
    </div>
  );
};
