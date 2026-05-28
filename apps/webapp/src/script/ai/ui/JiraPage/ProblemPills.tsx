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

import React, {useState} from 'react';
import {createPortal} from 'react-dom';

import type {JiraProblemRecord} from 'src/script/ai/storage/records';

// ─── Fixable rule registry ────────────────────────────────────────────────────

type FixType = 'title' | 'story_points' | 'comment';

const FIXABLE_RULES: Record<string, FixType> = {
  title_missing_bracket_format:     'title',
  story_points_not_fibonacci:       'story_points',
  in_progress_missing_story_points: 'story_points',
  in_progress_no_recent_comment:    'comment',
};

// ─── Domain constants ─────────────────────────────────────────────────────────

const AREAS    = ['BasePackage', 'Customer', 'WireCloud', 'InternalTool', 'Documentation'];
const PRODUCTS = ['Backend', 'Webapp', 'Teams', 'iOS', 'Android'];
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  problems: JiraProblemRecord[];
  /** Called with (area, product) to fix a malformed title. Omit to hide fix icon. */
  onFixTitle?: (area: string, product: string) => Promise<void>;
  /** Called with a Fibonacci point value to set story points. Omit to hide fix icon. */
  onFixStoryPoints?: (points: number) => Promise<void>;
  /** Called with comment text to post a comment on the ticket. Omit to hide fix icon. */
  onAddComment?: (text: string) => Promise<void>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const WARN_ICON  = '⚠';
const CHECK_ICON = '✓';

const PenIcon = () => (
  <svg width="10" height="10" viewBox="0 0 15 15" fill="none" aria-hidden="true">
    <path
      d="M11.5 1.5L13.5 3.5L5.5 11.5H3.5V9.5L11.5 1.5Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
    />
  </svg>
);

// ─── Shared dialog styles ─────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position:        'fixed',
  inset:           0,
  background:      'rgba(0,0,0,0.65)',
  zIndex:          9999,
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
};

const cardStyle: React.CSSProperties = {
  background:   '#26272c',
  border:       '1px solid #34373d',
  borderRadius: 10,
  padding:      '20px 24px',
  minWidth:     340,
  maxWidth:     460,
  boxShadow:    '0 12px 40px rgba(0,0,0,0.5)',
};

const dialogTitleStyle: React.CSSProperties = {
  fontSize:     '0.92rem',
  fontWeight:   700,
  color:        '#dce0e3',
  marginBottom: 18,
};

const fieldLabelStyle: React.CSSProperties = {
  fontSize:      '0.63rem',
  fontWeight:    700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color:         '#676b71',
  marginBottom:  6,
};

const selectStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '7px 10px',
  background:   '#17181a',
  border:       '1px solid #34373d',
  borderRadius: 6,
  color:        '#dce0e3',
  fontSize:     '0.82rem',
  cursor:       'pointer',
  outline:      'none',
  marginBottom: 14,
};

const btnRowStyle: React.CSSProperties = {
  display:        'flex',
  gap:            8,
  marginTop:      4,
  justifyContent: 'flex-end',
};

const btnPrimary = (disabled: boolean): React.CSSProperties => ({
  padding:      '6px 18px',
  background:   '#3b82f6',
  color:        '#fff',
  border:       '1px solid #3b82f6',
  borderRadius: 6,
  cursor:       disabled ? 'not-allowed' : 'pointer',
  fontWeight:   600,
  fontSize:     '0.8rem',
  opacity:      disabled ? 0.5 : 1,
});

const btnSecondaryStyle: React.CSSProperties = {
  padding:      '6px 18px',
  background:   'transparent',
  color:        '#9fa1a7',
  border:       '1px solid #34373d',
  borderRadius: 6,
  cursor:       'pointer',
  fontWeight:   600,
  fontSize:     '0.8rem',
};

const errorBannerStyle: React.CSSProperties = {
  background:   'rgba(239,68,68,0.08)',
  border:       '1px solid rgba(248,113,113,0.25)',
  borderRadius: 6,
  padding:      '7px 10px',
  color:        '#fca5a5',
  fontSize:     '0.75rem',
  marginBottom: 12,
};

// ─── Title fix dialog ─────────────────────────────────────────────────────────

interface TitleFixDialogProps {
  onClose:  () => void;
  onApply:  (area: string, product: string) => Promise<void>;
}

const TitleFixDialog = ({onClose, onApply}: TitleFixDialogProps) => {
  const [area, setArea]       = useState('');
  const [product, setProduct] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleApply = async () => {
    if (!area || !product) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(area, product);
    } catch (err) {
      setError((err as Error).message);
      setApplying(false);
    }
  };

  const disabled = !area || !product || applying;

  return createPortal(
    <div style={overlayStyle} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <div style={cardStyle}>
        <div style={dialogTitleStyle}>Fix ticket title format</div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        <div style={fieldLabelStyle}>Area</div>
        <select style={selectStyle} value={area} onChange={e => setArea(e.target.value)}>
          <option value="">Select area…</option>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={fieldLabelStyle}>Product</div>
        <select style={selectStyle} value={product} onChange={e => setProduct(e.target.value)}>
          <option value="">Select product…</option>
          {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <div style={btnRowStyle}>
          <button style={btnSecondaryStyle} onClick={onClose} disabled={applying}>Cancel</button>
          <button style={btnPrimary(disabled)} disabled={disabled} onClick={() => void handleApply()}>
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ─── Story points dialog ──────────────────────────────────────────────────────

interface StoryPointsDialogProps {
  onClose:  () => void;
  onApply:  (points: number) => Promise<void>;
}

const StoryPointsDialog = ({onClose, onApply}: StoryPointsDialogProps) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleApply = async () => {
    if (selected === null) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(selected);
    } catch (err) {
      setError((err as Error).message);
      setApplying(false);
    }
  };

  const disabled = selected === null || applying;

  const pointBtnStyle = (pts: number): React.CSSProperties => ({
    width:          44,
    height:         44,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     selected === pts ? '#3b82f6' : '#17181a',
    color:          selected === pts ? '#fff'    : '#9fa1a7',
    border:         selected === pts ? '1px solid #3b82f6' : '1px solid #34373d',
    borderRadius:   8,
    cursor:         applying ? 'not-allowed' : 'pointer',
    fontWeight:     700,
    fontSize:       '0.9rem',
  });

  return createPortal(
    <div style={overlayStyle} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <div style={cardStyle}>
        <div style={dialogTitleStyle}>Set story points</div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:20}}>
          {FIBONACCI.map(pts => (
            <button
              key={pts}
              style={pointBtnStyle(pts)}
              disabled={applying}
              onClick={() => setSelected(pts)}
            >
              {pts}
            </button>
          ))}
        </div>

        <div style={btnRowStyle}>
          <button style={btnSecondaryStyle} onClick={onClose} disabled={applying}>Cancel</button>
          <button style={btnPrimary(disabled)} disabled={disabled} onClick={() => void handleApply()}>
            {applying ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ─── Add comment dialog ───────────────────────────────────────────────────────

interface CommentDialogProps {
  onClose:  () => void;
  onApply:  (text: string) => Promise<void>;
}

const textareaStyle: React.CSSProperties = {
  width:        '100%',
  minHeight:    100,
  padding:      '8px 10px',
  background:   '#17181a',
  border:       '1px solid #34373d',
  borderRadius: 6,
  color:        '#dce0e3',
  fontSize:     '0.82rem',
  resize:       'vertical',
  outline:      'none',
  boxSizing:    'border-box',
  fontFamily:   'inherit',
  lineHeight:   1.5,
  marginBottom: 14,
};

const CommentDialog = ({onClose, onApply}: CommentDialogProps) => {
  const [text, setText]       = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const handleApply = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setApplying(true);
    setError(null);
    try {
      await onApply(trimmed);
    } catch (err) {
      setError((err as Error).message);
      setApplying(false);
    }
  };

  const disabled = !text.trim() || applying;

  return createPortal(
    <div style={overlayStyle} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) onClose(); }}>
      <div style={{...cardStyle, minWidth: 400, maxWidth: 520}}>
        <div style={dialogTitleStyle}>Add a comment</div>

        {error && <div style={errorBannerStyle}>{error}</div>}

        <div style={fieldLabelStyle}>Comment</div>
        <textarea
          style={textareaStyle}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write your update…"
          disabled={applying}
          autoFocus
        />

        <div style={btnRowStyle}>
          <button style={btnSecondaryStyle} onClick={onClose} disabled={applying}>Cancel</button>
          <button style={btnPrimary(disabled)} disabled={disabled} onClick={() => void handleApply()}>
            {applying ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const ProblemPills = ({problems, onFixTitle, onFixStoryPoints, onAddComment}: Props) => {
  const [openDialog, setOpenDialog] = useState<FixType | null>(null);

  const handleFixTitle = async (area: string, product: string) => {
    await onFixTitle!(area, product);
    setOpenDialog(null);
  };

  const handleFixStoryPoints = async (points: number) => {
    await onFixStoryPoints!(points);
    setOpenDialog(null);
  };

  const handleAddComment = async (text: string) => {
    await onAddComment!(text);
    setOpenDialog(null);
  };

  return (
    <>
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
        {problems.map((p, i) => {
          const resolved = p.status === 'resolved';
          const fix_type = !resolved ? FIXABLE_RULES[p.rule_id] : undefined;
          const has_fix  = fix_type === 'title'        ? !!onFixTitle
                         : fix_type === 'story_points' ? !!onFixStoryPoints
                         : fix_type === 'comment'      ? !!onAddComment
                         : false;

          return (
            <span
              key={p.id ?? `${p.rule_id}-${i}`}
              title={
                resolved
                  ? `Resolved ${p.resolved_at ? new Date(p.resolved_at).toLocaleDateString('en-GB') : ''}`
                  : has_fix
                    ? `Click to fix · Detected ${new Date(p.detected_at).toLocaleDateString('en-GB')}`
                    : `Detected ${new Date(p.detected_at).toLocaleDateString('en-GB')}`
              }
              onClick={has_fix ? e => { e.stopPropagation(); setOpenDialog(fix_type!); } : undefined}
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:           4,
                padding:       '2px 8px',
                borderRadius:  '10px',
                fontSize:      '0.67rem',
                fontWeight:    600,
                letterSpacing: '0.01em',
                cursor:        has_fix ? 'pointer' : 'default',
                ...(resolved
                  ? {background: 'rgba(99,115,129,0.1)', color: '#54585f', border: '1px solid rgba(99,115,129,0.15)'}
                  : {background: 'rgba(239,68,68,0.1)',  color: '#f87171', border: '1px solid rgba(248,113,113,0.2)'}
                ),
              }}
            >
              <span style={{fontSize: '0.6rem'}}>{resolved ? CHECK_ICON : WARN_ICON}</span>
              {p.message}
              {has_fix && <PenIcon />}
            </span>
          );
        })}
      </div>

      {openDialog === 'title' && (
        <TitleFixDialog
          onClose={() => setOpenDialog(null)}
          onApply={handleFixTitle}
        />
      )}

      {openDialog === 'story_points' && (
        <StoryPointsDialog
          onClose={() => setOpenDialog(null)}
          onApply={handleFixStoryPoints}
        />
      )}

      {openDialog === 'comment' && (
        <CommentDialog
          onClose={() => setOpenDialog(null)}
          onApply={handleAddComment}
        />
      )}
    </>
  );
};
