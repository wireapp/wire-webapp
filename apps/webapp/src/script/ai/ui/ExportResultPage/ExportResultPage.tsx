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

import {useLiveQuery} from 'dexie-react-hooks';

import {useAi} from 'src/script/ai';
import {navigate} from 'src/script/router/Router';
import {generateExportDetailUrl, generateExportsListUrl} from 'src/script/router/routeGenerator';
import {useAppState} from 'src/script/page/useAppState';

// ─── Format conversion ───────────────────────────────────────────────────────

type ExportFormat = 'markdown' | 'xml';

function escape_xml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function unescape_xml(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

function inline_md_to_xml(text: string): string {
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

function inline_xml_to_md(text: string): string {
  return text
    .replace(/<strong><em>(.*?)<\/em><\/strong>/g, '***$1***')
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/<code>(.*?)<\/code>/g, '`$1`');
}

function markdown_to_xml(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<export>'];
  let in_ul = false;

  const close_ul = () => {
    if (in_ul) {
      out.push('  </ul>');
      in_ul = false;
    }
  };

  for (const line of lines) {
    if (line.startsWith('#### ')) {
      close_ul();
      out.push(`  <h4>${inline_md_to_xml(escape_xml(line.slice(5)))}</h4>`);
    } else if (line.startsWith('### ')) {
      close_ul();
      out.push(`  <h3>${inline_md_to_xml(escape_xml(line.slice(4)))}</h3>`);
    } else if (line.startsWith('## ')) {
      close_ul();
      out.push(`  <h2>${inline_md_to_xml(escape_xml(line.slice(3)))}</h2>`);
    } else if (line.startsWith('# ')) {
      close_ul();
      out.push(`  <h1>${inline_md_to_xml(escape_xml(line.slice(2)))}</h1>`);
    } else if (/^[-*] /.test(line)) {
      if (!in_ul) {
        out.push('  <ul>');
        in_ul = true;
      }
      out.push(`    <li>${inline_md_to_xml(escape_xml(line.slice(2)))}</li>`);
    } else if (line.trim() === '') {
      close_ul();
    } else {
      close_ul();
      out.push(`  <p>${inline_md_to_xml(escape_xml(line))}</p>`);
    }
  }

  close_ul();
  out.push('</export>');
  return out.join('\n');
}

function xml_to_markdown(xml: string): string {
  const lines = xml.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    if (line.startsWith('<?xml') || line.trim() === '<export>' || line.trim() === '</export>') {
      continue;
    }

    const h1 = line.match(/^\s*<h1>(.*?)<\/h1>\s*$/);
    const h2 = line.match(/^\s*<h2>(.*?)<\/h2>\s*$/);
    const h3 = line.match(/^\s*<h3>(.*?)<\/h3>\s*$/);
    const h4 = line.match(/^\s*<h4>(.*?)<\/h4>\s*$/);
    const p  = line.match(/^\s*<p>(.*?)<\/p>\s*$/);
    const li = line.match(/^\s*<li>(.*?)<\/li>\s*$/);
    const ul_open  = line.match(/^\s*<ul>\s*$/);
    const ul_close = line.match(/^\s*<\/ul>\s*$/);

    if (ul_open)  { continue; }
    if (ul_close) { out.push(''); continue; }

    if (h1)      { out.push(''); out.push(`# ${inline_xml_to_md(unescape_xml(h1[1]))}`);    out.push(''); }
    else if (h2) { out.push(''); out.push(`## ${inline_xml_to_md(unescape_xml(h2[1]))}`);   out.push(''); }
    else if (h3) { out.push(''); out.push(`### ${inline_xml_to_md(unescape_xml(h3[1]))}`);  out.push(''); }
    else if (h4) { out.push(''); out.push(`#### ${inline_xml_to_md(unescape_xml(h4[1]))}`); out.push(''); }
    else if (p)  { out.push(inline_xml_to_md(unescape_xml(p[1]))); out.push(''); }
    else if (li) { out.push(`- ${inline_xml_to_md(unescape_xml(li[1]))}`); }
    else if (line.trim() !== '') { out.push(line); }
  }

  return out.join('\n').trim();
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: '#17181a',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderBottom: '1px solid #34373d',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexShrink: 0,
};

const backButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#60a5fa',
  cursor: 'pointer',
  padding: '0',
  fontSize: '0.82rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 600,
  color: '#dce0e3',
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const format_toggle_container_style: React.CSSProperties = {
  display: 'flex',
  background: '#26272c',
  borderRadius: '6px',
  border: '1px solid #34373d',
  overflow: 'hidden',
  flexShrink: 0,
};

const format_toggle_button_style = (active: boolean): React.CSSProperties => ({
  padding: '4px 14px',
  border: 'none',
  background: active ? '#2563eb' : 'transparent',
  color: active ? '#fff' : '#9fa1a7',
  cursor: 'pointer',
  fontSize: '0.74rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  transition: 'background 0.12s, color 0.12s',
});

const textareaStyle: React.CSSProperties = {
  flex: 1,
  width: '100%',
  background: '#1a1b1e',
  color: '#dce0e3',
  border: 'none',
  outline: 'none',
  resize: 'none',
  padding: '20px 24px',
  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
  fontSize: '0.82rem',
  lineHeight: 1.6,
  boxSizing: 'border-box',
};

const footerStyle: React.CSSProperties = {
  position: 'relative',
  borderTop: '1px solid #34373d',
  padding: '10px 16px',
  display: 'flex',
  justifyContent: 'flex-end',
  flexShrink: 0,
};

const copyButtonStyle = (copied: boolean): React.CSSProperties => ({
  padding: '7px 18px',
  background: copied ? '#16a34a' : '#26272c',
  color: copied ? '#fff' : '#9fa1a7',
  border: `1px solid ${copied ? '#16a34a' : '#34373d'}`,
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 600,
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
});

const notFoundStyle: React.CSSProperties = {
  color: '#676b71',
  padding: '32px 24px',
  fontSize: '0.85rem',
};

// ─── Component ───────────────────────────────────────────────────────────────

/** Full-page editable textarea for the generated export. Toggle between Markdown and XML at the top. */
export const ExportResultPage = () => {
  const {aiStorage} = useAi();
  const active_export_id = useAppState(s => s.activeExportId);
  const [copied, setCopied] = useState(false);
  const [format, set_format] = useState<ExportFormat>('markdown');

  // null = not yet locally edited; falls back to record content
  const [local_text, set_local_text] = useState<string | null>(null);

  const record = useLiveQuery(
    () => (active_export_id ? aiStorage.getExport(active_export_id) : Promise.resolve(undefined)),
    [active_export_id],
  );

  const record_markdown = record?.markdown ?? '';

  // When no local edits exist, derive display from record (auto-converting if in xml mode)
  const display_text = local_text !== null
    ? local_text
    : (format === 'xml' ? markdown_to_xml(record_markdown) : record_markdown);

  const handle_format_switch = (new_format: ExportFormat) => {
    if (new_format === format) return;
    const current_as_markdown = format === 'xml' ? xml_to_markdown(display_text) : display_text;
    const converted = new_format === 'xml' ? markdown_to_xml(current_as_markdown) : current_as_markdown;
    set_local_text(converted);
    set_format(new_format);
  };

  const handle_change = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    set_local_text(value);
    // Always persist as markdown regardless of active display format
    const markdown_value = format === 'xml' ? xml_to_markdown(value) : value;
    if (active_export_id) {
      void aiStorage.updateExport(active_export_id, {markdown: markdown_value}).catch(() => {});
    }
  };

  const handle_copy = () => {
    void navigator.clipboard.writeText(display_text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    });
  };

  if (!active_export_id || !record) {
    return <div style={notFoundStyle}>Export not found.</div>;
  }

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <button style={backButtonStyle} onClick={() => navigate(generateExportDetailUrl(active_export_id))}>
          ← Edit selections
        </button>
        <span style={titleStyle}>{record.name || 'Untitled Export'}</span>

        <div style={format_toggle_container_style}>
          <button
            style={format_toggle_button_style(format === 'markdown')}
            onClick={() => handle_format_switch('markdown')}
          >
            MD
          </button>
          <button
            style={format_toggle_button_style(format === 'xml')}
            onClick={() => handle_format_switch('xml')}
          >
            XML
          </button>
        </div>

        <button
          style={{...backButtonStyle, marginLeft: 'auto'}}
          onClick={() => navigate(generateExportsListUrl())}
        >
          All exports
        </button>
      </div>

      <textarea
        style={textareaStyle}
        value={display_text}
        onChange={handle_change}
        spellCheck={false}
        aria-label={`Export ${format}`}
      />

      <div style={footerStyle}>
        <button style={copyButtonStyle(copied)} onClick={handle_copy}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
};
