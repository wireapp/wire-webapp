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

// External
import {loader, type BeforeMount} from '@monaco-editor/react';
import * as monacoEditor from 'monaco-editor';

// Use the locally bundled monaco-editor (set up by MonacoWebpackPlugin) instead of CDN,
// because the app's CSP does not allow loading scripts from cdn.jsdelivr.net.
loader.config({monaco: monacoEditor});

// ─── Language / theme IDs ────────────────────────────────────────────────────

/** Custom Monarch language for Handlebars templates with embedded XML and Markdown. */
export const HBS_XML_LANG_ID = 'hbs-xml';

/** Shared dark theme used by all Monaco editors on the AI Preferences page. */
export const THEME_ID = 'hbs-dark';

// ─── Shared editor options ───────────────────────────────────────────────────

export const EDITOR_OPTIONS: monacoEditor.editor.IStandaloneEditorConstructionOptions = {
  minimap:              {enabled: false},
  scrollBeyondLastLine: false,
  wordWrap:             'on',
  fontSize:             13,
  fontFamily:           "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  fontLigatures:        true,
  lineNumbers:          'on',
  renderLineHighlight:  'line',
  padding:              {top: 10, bottom: 10},
  scrollbar:            {verticalScrollbarSize: 6, horizontalScrollbarSize: 6},
  overviewRulerLanes:   0,
  folding:              true,
  automaticLayout:      true,
};

// ─── Monarch tokenizer ───────────────────────────────────────────────────────

// Three layers: XML structural tags → Handlebars {{ }} expressions → Markdown inline syntax.
const MONARCH_TOKENS: monacoEditor.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\{\{\{/, 'delimiter.hbs', '@hbs_raw'],
      [/\{\{!--/, 'comment.hbs', '@hbs_comment'],
      [/\{\{/, 'delimiter.hbs', '@hbs_expr'],
      [/<!--/, 'comment.xml', '@xml_comment'],
      [/<\/[\w.:-]+\s*>/, 'tag.xml'],
      [/<[\w.:-]+/, 'tag.xml', '@xml_tag'],
      [/\*\*[^*\n]+\*\*/, 'strong.md'],
      [/\*[^*\n]+\*/, 'emphasis.md'],
      [/`[^`\n]+`/, 'code.md'],
      [/^#+\s+.*$/, 'heading.md'],
      [/^\d+\.\s/, 'list.md'],
      [/^[-*+]\s/, 'list.md'],
      [/^"""/, 'string.quote'],
    ],
    hbs_raw: [
      [/\}\}\}/, 'delimiter.hbs', '@pop'],
      [/[\w.@[\]]+/, 'variable.hbs'],
      [/\s+/, ''],
    ],
    hbs_comment: [
      [/--\}\}/, 'comment.hbs', '@pop'],
      [/[\s\S]/, 'comment.hbs'],
    ],
    hbs_expr: [
      [/\}\}/, 'delimiter.hbs', '@pop'],
      [/(#if|#unless|#each|#with|#block|\/if|\/unless|\/each|\/with|\/block|else)(?=[\s}])/, 'keyword.hbs'],
      [/[\w.@/[\]]+/, 'variable.hbs'],
      [/"[^"]*"/, 'string.hbs'],
      [/'[^']*'/, 'string.hbs'],
      [/\s+/, ''],
    ],
    xml_comment: [
      [/-->/, 'comment.xml', '@pop'],
      [/[^-]+/, 'comment.xml'],
      [/-/, 'comment.xml'],
    ],
    xml_tag: [
      [/\/>/, 'tag.xml', '@pop'],
      [/>/, 'tag.xml', '@pop'],
      [/[\w:-]+(?=\s*=)/, 'attribute.name.xml'],
      [/[\w:-]+/, 'attribute.name.xml'],
      [/=/, 'delimiter.xml'],
      [/"[^"]*"/, 'attribute.value.xml'],
      [/'[^']*'/, 'attribute.value.xml'],
      [/\{\{/, 'delimiter.hbs', '@hbs_expr'],
      [/\s+/, ''],
    ],
  },
};

// ─── Theme definition ────────────────────────────────────────────────────────

const THEME_DEF: monacoEditor.editor.IStandaloneThemeData = {
  base:    'vs-dark',
  inherit: true,
  rules: [
    {token: 'tag.xml',             foreground: '6B9FDB'},
    {token: 'attribute.name.xml',  foreground: '9CDCFE'},
    {token: 'attribute.value.xml', foreground: 'CE9178'},
    {token: 'delimiter.xml',       foreground: '808080'},
    {token: 'comment.xml',         foreground: '6A9955', fontStyle: 'italic'},
    {token: 'delimiter.hbs',       foreground: 'FFD700', fontStyle: 'bold'},
    {token: 'keyword.hbs',         foreground: 'C586C0'},
    {token: 'variable.hbs',        foreground: '4EC9B0'},
    {token: 'string.hbs',          foreground: 'CE9178'},
    {token: 'comment.hbs',         foreground: '6A9955', fontStyle: 'italic'},
    {token: 'strong.md',           foreground: 'DCDCAA', fontStyle: 'bold'},
    {token: 'emphasis.md',         foreground: 'DCDCAA', fontStyle: 'italic'},
    {token: 'code.md',             foreground: 'D4A373'},
    {token: 'heading.md',          foreground: '4EC9B0', fontStyle: 'bold'},
    {token: 'list.md',             foreground: 'CE9178'},
    {token: 'string.quote',        foreground: '808080'},
  ],
  colors: {
    'editor.background':                  '#0F1621',
    'editor.foreground':                  '#F3F4F6',
    'editorLineNumber.foreground':        '#4B5563',
    'editorLineNumber.activeForeground':  '#9CA3AF',
    'editor.lineHighlightBackground':     '#1A2332',
    'editor.selectionBackground':         '#2D3D53',
    'editor.inactiveSelectionBackground': '#1F2937',
    'editorGutter.background':            '#0F1621',
    'editorCursor.foreground':            '#60A5FA',
    'editorWidget.background':            '#1F2937',
    'editorSuggestWidget.background':     '#1F2937',
  },
};

// ─── beforeMount callback ────────────────────────────────────────────────────

let registered = false;

/** Pass as `beforeMount` to any Editor on this page.
 *  Registers the hbs-xml language and the shared dark theme exactly once. */
export const setupMonaco: BeforeMount = monacoInstance => {
  if (registered) {
    return;
  }
  registered = true;
  monacoInstance.languages.register({id: HBS_XML_LANG_ID, aliases: ['Handlebars XML', 'hbs-xml']});
  monacoInstance.languages.setMonarchTokensProvider(HBS_XML_LANG_ID, MONARCH_TOKENS);
  monacoInstance.editor.defineTheme(THEME_ID, THEME_DEF);
};

// ─── Shared container styles ─────────────────────────────────────────────────

export const editorContainerStyle: React.CSSProperties = {
  border:       '1px solid #1F2D42',
  borderRadius: '6px',
  overflow:     'hidden',
};

export const loadingPlaceholderStyle: React.CSSProperties = {
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  color:           '#4B5563',
  fontSize:        '0.85rem',
  backgroundColor: '#0F1621',
  borderRadius:    '6px',
};
