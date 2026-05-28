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

import {useEffect, useRef, useState} from 'react';

import {useLiveQuery} from 'dexie-react-hooks';
import {createPortal} from 'react-dom';

import {Tooltip} from '@wireapp/react-ui-kit';

import {useAi} from 'src/script/ai';
import type {EntryLifecycleStatus} from 'src/script/ai/domain/EntryTypes';
import type {Entry, EntryType} from 'src/script/ai/domain/EntryTypes';
import type {AiFinalReportEntryRecord} from 'src/script/ai/storage/records/AiFinalReportEntryRecord';
import {getLogger} from 'Util/logger';

import {JiraLinkText} from './JiraLinkText';

const log = getLogger('AI/EntryCard');

// --- Icons (inline SVG to avoid icon lib dependency) ---

const ReportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="1" width="10" height="14" rx="1.5" stroke="#9ca3af" strokeWidth="1.5" />
    <line x1="4.5" y1="5" x2="9.5" y2="5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="7.5" x2="9.5" y2="7.5" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="10" x2="7.5" y2="10" stroke="#9ca3af" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const TodoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="#9ca3af" strokeWidth="1.5" />
    <polyline points="5,8 7,10 11,6" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TicketIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path
      d="M2 5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2a1.5 1.5 0 0 0 0 3v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1.5 1.5 0 0 0 0-3V5Z"
      stroke="#9ca3af"
      strokeWidth="1.5"
    />
  </svg>
);

const GoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2 7h9M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AcceptIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polyline points="2,7 5.5,10.5 12,4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HideIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="3" y1="3" x2="11" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="11" y1="3" x2="3" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const NoteIcon = ({filled}: {filled: boolean}) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="1.5" width="10" height="11" rx="1.5"
      stroke="currentColor" strokeWidth="1.6"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
    <line x1="4.5" y1="5"   x2="9.5" y2="5"   stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="7.2" x2="9.5" y2="7.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="4.5" y1="9.4" x2="7.5" y2="9.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// --- Styles ---

const cardBase: React.CSSProperties = {
  border: '1px solid #374151',
  borderRadius: '6px',
  padding: '12px 16px',
  marginBottom: '10px',
  backgroundColor: '#1f2937',
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  position: 'relative',
};

const iconColStyle: React.CSSProperties = {
  flexShrink: 0,
  paddingTop: '2px',
};

const contentColStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 600,
  marginBottom: '6px',
  fontSize: '0.9rem',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#d1d5db',
  whiteSpace: 'pre-wrap',
};

const notesStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#9ca3af',
  marginTop: '6px',
  fontStyle: 'italic',
};

const entryNoteStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#fbbf24',
  marginTop: '8px',
  padding: '6px 10px',
  background: 'rgba(251,191,36,0.07)',
  borderLeft: '2px solid #fbbf24',
  borderRadius: '0 4px 4px 0',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.5,
};

// ─── Note dialog ─────────────────────────────────────────────────────────────

const dialogOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const dialogBoxStyle: React.CSSProperties = {
  background: '#1e2023',
  border: '1px solid #34373d',
  borderRadius: '10px',
  padding: '20px 24px',
  width: '420px',
  maxWidth: '90vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const dialogTitleStyle: React.CSSProperties = {
  fontSize: '0.92rem',
  fontWeight: 700,
  color: '#dce0e3',
  marginBottom: '14px',
};

const dialogTextareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '110px',
  background: '#17181a',
  border: '1px solid #34373d',
  borderRadius: '6px',
  color: '#dce0e3',
  fontSize: '0.85rem',
  padding: '10px 12px',
  resize: 'vertical',
  outline: 'none',
  lineHeight: 1.5,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const dialogFooterStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  marginTop: '14px',
};

const dialogSaveStyle: React.CSSProperties = {
  padding: '7px 18px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
};

const dialogCancelStyle: React.CSSProperties = {
  padding: '7px 14px',
  background: 'none',
  color: '#9ca3af',
  border: '1px solid #34373d',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.82rem',
};

const dialogDeleteStyle: React.CSSProperties = {
  padding: '7px 14px',
  background: 'none',
  color: '#f87171',
  border: '1px solid #f8717133',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.82rem',
  marginRight: 'auto',
};

interface NoteDialogProps {
  initial_text: string;
  on_save: (text: string) => void;
  on_delete: () => void;
  on_cancel: () => void;
}

const NoteDialog = ({initial_text, on_save, on_delete, on_cancel}: NoteDialogProps) => {
  const [text, setText] = useState(initial_text);
  const textarea_ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textarea_ref.current?.focus();
  }, []);

  const handle_key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      on_cancel();
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      on_save(text);
    }
  };

  return createPortal(
    <div style={dialogOverlayStyle} onClick={on_cancel}>
      <div style={dialogBoxStyle} onClick={e => e.stopPropagation()} onKeyDown={handle_key}>
        <div style={dialogTitleStyle}>Note</div>
        <textarea
          ref={textarea_ref}
          style={dialogTextareaStyle}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a note…"
        />
        <div style={dialogFooterStyle}>
          {initial_text && (
            <button style={dialogDeleteStyle} onClick={on_delete}>
              Delete note
            </button>
          )}
          <button style={dialogCancelStyle} onClick={on_cancel}>
            Cancel
          </button>
          <button style={dialogSaveStyle} onClick={() => on_save(text)}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '6px',
};

const actionColStyle: React.CSSProperties = {
  flexShrink: 0,
  display: 'flex',
  gap: '4px',
  alignItems: 'center',
};

const actionButtonStyle = (color: string): React.CSSProperties => ({
  width: '26px',
  height: '26px',
  border: `1px solid ${color}33`,
  borderRadius: '5px',
  backgroundColor: `${color}1a`,
  color,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
});

// --- Component ---

const ENTRY_ICONS: Record<EntryType, React.ReactNode> = {
  report: <ReportIcon />,
  todo: <TodoIcon />,
  ticket: <TicketIcon />,
};

const ENTRY_LABELS: Record<EntryType, string> = {
  report: 'Report',
  todo: 'Todo',
  ticket: 'Ticket',
};

interface EntryCardProps {
  /** A final report entry record (with mutable_state, id, and status). */
  record?: AiFinalReportEntryRecord;
  /** A raw entry without a stable id (sub-report context). */
  entry?: Entry;
  /** Current lifecycle status for raw-entry context (sub-report). */
  entryStatus?: EntryLifecycleStatus;
  /** Called when the user accepts or hides a raw entry (sub-report context). */
  onStatusChange?: (status: EntryLifecycleStatus) => void;
  /** Called when the user clicks the "go to source" button. */
  onNavigate?: () => void;
  /** ISO 8601 timestamp shown in the "go" button tooltip to indicate the source message time. */
  navigateTimestamp?: string;
}

/**
 * Renders a single report/todo/ticket entry card.
 *
 * Accepts two modes:
 *  - `record` prop: final report entry with stable id and status — handles status updates internally.
 *  - `entry` + `entryStatus` + `onStatusChange` props: sub-report entry without an id — delegates status to caller.
 *
 * Shows a type icon on the left and accept/hide action buttons on the right (visible on hover).
 * Hidden entries are rendered in greyscale to allow undoing.
 */
export const EntryCard = ({record, entry, entryStatus, onStatusChange, onNavigate, navigateTimestamp}: EntryCardProps) => {
  const {aiStorage} = useAi();
  const [hovered, setHovered] = useState(false);
  const [note_dialog_open, setNoteDialogOpen] = useState(false);

  const note_record = useLiveQuery(
    () => (record ? aiStorage.getNote(record.id) : Promise.resolve(undefined)),
    [record?.id],
  );
  const has_note = !!note_record?.text;

  const handle_note_save = async (text: string) => {
    if (!record) {
      return;
    }
    try {
      await aiStorage.upsertNote(record.id, text);
    } catch (error) {
      log.error('Failed to save note for entry', record.id, error);
    }
    setNoteDialogOpen(false);
  };

  const handle_note_delete = async () => {
    if (!record) {
      return;
    }
    try {
      await aiStorage.deleteNote(record.id);
    } catch (error) {
      log.error('Failed to delete note for entry', record.id, error);
    }
    setNoteDialogOpen(false);
  };

  const payload = record?.payload ?? entry;
  if (!payload) {
    return null;
  }

  // Resolve current lifecycle status from whichever source is active
  const status: EntryLifecycleStatus = record?.status ?? entryStatus ?? 'pending';
  const isHidden = status === 'hidden';

  const handleStatusChange = async (next: EntryLifecycleStatus) => {
    // Toggle back to pending if clicking the already-active action
    const resolved = status === next ? 'pending' : next;

    if (record) {
      try {
        await aiStorage.updateFinalEntryStatus(record.id, resolved);
      } catch (error) {
        log.error('Failed to update status for final entry', record.id, error);
      }
      return;
    }

    onStatusChange?.(resolved);
  };

  const isChecked = record?.mutable_state?.checked ?? false;
  const notes = record?.mutable_state?.notes;
  const titleOverride = record?.mutable_state?.title;
  const descriptionOverride = record?.mutable_state?.description;

  const handleCheckChange = async () => {
    if (!record) {
      return;
    }
    try {
      await aiStorage.updateFinalEntryMutable(record.id, {checked: !isChecked});
    } catch (error) {
      log.error('Failed to update checked state for entry', record.id, error);
    }
  };

  const getTitle = (): string | null => {
    if (titleOverride) {
      return titleOverride;
    }
    if (payload.type === 'todo') {
      return payload.title;
    }
    if (payload.type === 'ticket') {
      return payload.title;
    }
    return null;
  };

  const getDescription = (): string => {
    if (descriptionOverride) {
      return descriptionOverride;
    }
    if (payload.type === 'report') {
      return payload.description;
    }
    if (payload.type === 'todo') {
      return payload.description;
    }
    if (payload.type === 'ticket') {
      return payload.description;
    }
    return '';
  };

  const title = getTitle();
  const description = getDescription();

  const cardStyle: React.CSSProperties = {
    ...cardBase,
    ...(isHidden ? {filter: 'grayscale(1)', opacity: 0.45} : {}),
  };

  return (
    <div style={cardStyle} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Tooltip body={ENTRY_LABELS[payload.type]}>
        <div style={iconColStyle}>{ENTRY_ICONS[payload.type]}</div>
      </Tooltip>

      <div style={contentColStyle}>
        {payload.type === 'todo' && record ? (
          <div style={checkboxRowStyle}>
            <input
              type="checkbox"
              id={`entry-check-${record.id}`}
              checked={isChecked}
              onChange={() => void handleCheckChange()}
              style={{cursor: 'pointer', width: '16px', height: '16px'}}
            />
            <label htmlFor={`entry-check-${record.id}`} style={{...titleStyle, cursor: 'pointer'}}>
              <JiraLinkText text={title ?? ''} />
            </label>
          </div>
        ) : (
          title && <div style={titleStyle}><JiraLinkText text={title ?? ''} /></div>
        )}

        <div style={descriptionStyle}><JiraLinkText text={description} /></div>

        {notes && <div style={notesStyle}>Notes: <JiraLinkText text={notes} /></div>}

        {has_note && <div style={entryNoteStyle}><JiraLinkText text={note_record!.text} /></div>}
      </div>

      <div style={{...actionColStyle, visibility: (hovered || has_note) ? 'visible' : 'hidden'}}>
        {record && (
          <button
            style={actionButtonStyle(has_note ? '#fbbf24' : '#6b7280')}
            title={has_note ? 'Edit note' : 'Add note'}
            onClick={() => setNoteDialogOpen(true)}
          >
            <NoteIcon filled={has_note} />
          </button>
        )}
        {onNavigate && (
          <button
            style={actionButtonStyle('#60a5fa')}
            title={navigateTimestamp ? `Go to conversation (${navigateTimestamp.replace('T', ' ').slice(0, 16)})` : 'Go to source conversation'}
            onClick={onNavigate}
          >
            <GoIcon />
          </button>
        )}
        {status !== 'accepted' && (
          <button
            style={actionButtonStyle('#22c55e')}
            title="Accept"
            onClick={() => void handleStatusChange('accepted')}
          >
            <AcceptIcon />
          </button>
        )}
        {status !== 'hidden' && (
          <button
            style={actionButtonStyle('#ef4444')}
            title="Hide"
            onClick={() => void handleStatusChange('hidden')}
          >
            <HideIcon />
          </button>
        )}
      </div>

      {note_dialog_open && record && (
        <NoteDialog
          initial_text={note_record?.text ?? ''}
          on_save={text => void handle_note_save(text)}
          on_delete={() => void handle_note_delete()}
          on_cancel={() => setNoteDialogOpen(false)}
        />
      )}
    </div>
  );
};
