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

import type {CSSObject} from '@emotion/react';

export const noteTakerSlotStyles: CSSObject = {
  flex: '0 0 380px',
  width: 380,
  maxWidth: '100vw',
  height: '100%',
  minHeight: 0,
  borderLeft: '1px solid var(--border-color, #e5e7eb)',
  '@media (max-width: 1100px)': {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 3,
    boxShadow: '-8px 0 32px rgba(0,0,0,.12)',
  },
  '@media (max-width: 768px)': {position: 'absolute', inset: 0, width: '100%', zIndex: 3, borderLeft: 0},
};

export const noteTakerPanelStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  background: 'var(--app-bg-secondary, #fff)',
  color: 'var(--main-color, #202428)',
  fontSize: 14,
  lineHeight: 1.5,
  overflow: 'hidden',
  '& button, & select, & input': {font: 'inherit', color: 'inherit'},
  '& button': {cursor: 'pointer'},
  '& button:disabled': {opacity: 0.45, cursor: 'default'},
  '& button:focus-visible, & summary:focus-visible, & select:focus-visible, & input:focus-visible': {
    outline: '2px solid var(--accent-color)',
    outlineOffset: 3,
  },
  '& svg': {fill: 'currentColor', flexShrink: 0},
  '& p': {margin: 0},
  '& .notes-header': {display: 'flex', alignItems: 'center', gap: 12, padding: '22px 22px 18px'},
  '& .notes-mark': {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: 'var(--accent-color-highlight, #fff0f2)',
    color: 'var(--accent-color, #df294a)',
    display: 'grid',
    placeItems: 'center',
  },
  '& h2': {margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.3},
  '& .notes-eyebrow': {fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.55},
  '& .notes-close': {
    marginLeft: 'auto',
    width: 30,
    height: 30,
    display: 'grid',
    placeItems: 'center',
    border: 0,
    borderRadius: 8,
    background: 'transparent',
  },
  '& .notes-close:hover': {background: 'var(--accent-color-highlight, #f3f4f6)'},
  '& .notes-toolbar': {padding: '0 22px 18px', display: 'flex', gap: 8},
  '& .notes-primary, & .notes-export': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 40,
    padding: '8px 14px',
    borderRadius: 9,
    fontWeight: 600,
  },
  '& .notes-primary': {
    flex: 1,
    border: '1px solid var(--main-color)',
    background: 'var(--main-color, #202428)',
    color: 'var(--app-bg-secondary, white)',
  },
  '& .notes-export': {border: '1px solid var(--border-color, #ddd)', background: 'transparent'},
  '& .notes-privacy': {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    padding: '0 22px 16px',
    opacity: 0.65,
    fontSize: 12,
  },
  '& .notes-state': {
    padding: '12px 22px',
    borderTop: '1px solid var(--border-color, #eee)',
    borderBottom: '1px solid var(--border-color, #eee)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 12,
  },
  '& .notes-state-label': {display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600},
  '& .notes-live-dot': {width: 7, height: 7, borderRadius: '50%', background: '#27a16b'},
  '& .notes-model': {opacity: 0.55},
  '& .notes-transcript': {
    flex: 1,
    minHeight: 100,
    overflowY: 'auto',
    padding: '22px',
    userSelect: 'text',
  },
  '& .notes-empty': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    textAlign: 'center',
    minHeight: 230,
    height: '100%',
    gap: 12,
  },
  '& .notes-empty-icon': {
    width: 64,
    height: 64,
    borderRadius: 20,
    display: 'grid',
    placeItems: 'center',
    background: 'var(--accent-color-highlight, #f7f7f8)',
    opacity: 0.7,
  },
  '& .notes-empty strong': {fontSize: 16, fontWeight: 600},
  '& .notes-empty p': {maxWidth: 260, fontSize: 13, opacity: 0.6},
  '& .notes-entry': {marginBottom: 22},
  '& .notes-entry-heading': {display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12},
  '& .notes-avatar': {
    width: 24,
    height: 24,
    borderRadius: 8,
    background: 'var(--accent-color-highlight, #f5edf0)',
    color: 'var(--accent-color, #d62949)',
    display: 'grid',
    placeItems: 'center',
    fontSize: 11,
    fontWeight: 600,
  },
  '& .notes-time': {marginLeft: 'auto', fontSize: 11, opacity: 0.45, fontVariantNumeric: 'tabular-nums'},
  '& .notes-entry p': {paddingLeft: 32, lineHeight: 1.65, overflowWrap: 'anywhere'},
  '& .notes-draft': {opacity: 0.7},
  '& .notes-draft-label': {fontSize: 10, color: '#188252', fontWeight: 600},
  '& .notes-message': {fontSize: 12, opacity: 0.65, padding: '0 22px 12px', overflowWrap: 'anywhere'},
  '& .notes-settings': {
    borderTop: '1px solid var(--border-color, #e5e7eb)',
    padding: '14px 22px',
    flexShrink: 0,
    maxHeight: '50%',
    overflowY: 'auto',
  },
  '& .notes-settings summary': {fontSize: 12, cursor: 'pointer', fontWeight: 600},
  '& .notes-settings-grid': {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: 14},
  '& .notes-settings label': {display: 'flex', flexDirection: 'column', gap: 5, fontSize: 11, fontWeight: 500},
  '& .notes-settings select, & .notes-settings input': {
    width: '100%',
    minWidth: 0,
    padding: '8px',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: 7,
    background: 'var(--app-bg-secondary, #fff)',
    fontSize: 12,
  },
  '& .notes-settings .notes-wide': {gridColumn: '1 / -1'},
  '& .notes-settings-hint': {fontSize: 11, opacity: 0.55, paddingTop: 12},
};
