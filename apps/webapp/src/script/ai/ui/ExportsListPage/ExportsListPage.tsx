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
import {format} from 'date-fns';

import {useAi} from 'src/script/ai';
import {navigate} from 'src/script/router/Router';
import {generateExportCreateUrl, generateExportDetailUrl} from 'src/script/router/routeGenerator';

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#17181a',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '20px 24px 16px',
  borderBottom: '1px solid #34373d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
};

const titleStyle: React.CSSProperties = {fontSize: '1rem', fontWeight: 700, color: '#dce0e3', margin: 0};

const bodyStyle: React.CSSProperties = {flex: 1, overflowY: 'auto', padding: '16px 24px'};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#676b71',
  padding: '48px 24px',
  fontSize: '0.85rem',
};

const rowStyle: React.CSSProperties = {
  background: '#26272c',
  border: '1px solid #34373d',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
};

const rowNameStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#dce0e3',
};

const rowMetaStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#676b71',
  marginTop: '3px',
};

const rowChevronStyle: React.CSSProperties = {
  color: '#676b71',
  flexShrink: 0,
};

const newButtonStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
};

// ─── Component ───────────────────────────────────────────────────────────────

/** Lists all saved exports and provides a button to create a new one. */
export const ExportsListPage = () => {
  const {aiStorage} = useAi();
  const exports = useLiveQuery(() => aiStorage.listExports(), []) ?? [];

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div>
          <h1 style={titleStyle}>Exports</h1>
        </div>
        <button style={newButtonStyle} onClick={() => navigate(generateExportCreateUrl())}>
          New export
        </button>
      </div>

      <div style={bodyStyle}>
        {exports.length === 0 ? (
          <div style={emptyStyle}>
            No exports yet. Click <strong>New export</strong> to create one.
          </div>
        ) : (
          exports.map(exp => (
            <div
              key={exp.id}
              style={rowStyle}
              onClick={() => navigate(generateExportDetailUrl(exp.id))}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && navigate(generateExportDetailUrl(exp.id))}
            >
              <div>
                <div style={rowNameStyle}>{exp.name || '(Untitled)'}</div>
                <div style={rowMetaStyle}>
                  Created {format(new Date(exp.created_at), 'PP p')}
                  {exp.markdown ? ' · Exported' : ''}
                </div>
              </div>
              <div style={rowChevronStyle}>›</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
