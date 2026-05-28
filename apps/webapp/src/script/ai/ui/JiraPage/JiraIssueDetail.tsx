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

import React, {useCallback, useEffect, useState} from 'react';

import {useAi} from 'src/script/ai';
import {useJiraFix} from 'src/script/ai/jira/useJiraFix';
import type {JiraProblemRecord} from 'src/script/ai/storage/records';
import {JiraLinkText} from '../shared/JiraLinkText';

import {ProblemPills} from './ProblemPills';
import {getLogger} from 'Util/logger';

const log = getLogger('AI/JiraIssueDetail');

// ─── ADF types ────────────────────────────────────────────────────────────────

interface AdfMark {
  type: string;
  attrs?: Record<string, string>;
}

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  marks?: AdfMark[];
  attrs?: Record<string, unknown>;
}

// ─── Jira data types ──────────────────────────────────────────────────────────

interface JiraUser {
  displayName: string;
  avatarUrls: {'48x48': string; '24x24': string};
}

interface JiraStatus {
  name: string;
  statusCategory: {colorName: string};
}

interface JiraComment {
  id: string;
  author: JiraUser;
  body: AdfNode;
  created: string;
  updated: string;
}

interface JiraDetailFields {
  summary: string;
  description: AdfNode | null;
  status: JiraStatus;
  priority: {name: string; iconUrl: string} | null;
  assignee: JiraUser | null;
  reporter: JiraUser | null;
  issuetype: {name: string; iconUrl: string};
  labels: string[];
  components: Array<{name: string}>;
  fixVersions: Array<{name: string}>;
  customfield_10004: number | null;
  created: string;
  updated: string;
  comment: {comments: JiraComment[]; total: number};
  subtasks: Array<{key: string; fields: {summary: string; status: JiraStatus}}>;
  parent?: {key: string; fields: {summary: string}};
}

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  'blue-grey': {bg: 'rgba(99,115,129,0.2)',  text: '#9fa1a7'},
  'yellow':    {bg: 'rgba(255,196,0,0.15)',  text: '#fcd34d'},
  'green':     {bg: 'rgba(74,222,128,0.12)', text: '#4ade80'},
  'red':       {bg: 'rgba(239,68,68,0.12)',  text: '#f87171'},
};

const statusChipStyle = (colorName: string): React.CSSProperties => {
  const c = STATUS_COLORS[colorName] ?? STATUS_COLORS['blue-grey'];
  return {
    display:      'inline-block',
    padding:      '3px 10px',
    borderRadius: '12px',
    fontSize:     '0.72rem',
    fontWeight:   700,
    background:   c.bg,
    color:        c.text,
  };
};

// ─── ADF renderer ─────────────────────────────────────────────────────────────

const AdfText = ({node}: {node: AdfNode}): React.ReactElement => {
  const has_link_mark = (node.marks ?? []).some(m => m.type === 'link');

  // Use JiraLinkText for the base text node only when no link mark is present,
  // to avoid generating nested <a> elements (invalid HTML, broken click handling).
  let el: React.ReactElement = has_link_mark
    ? <>{node.text ?? ''}</>
    : <JiraLinkText text={node.text ?? ''} />;

  for (const mark of (node.marks ?? [])) {
    if (mark.type === 'strong')     el = <strong>{el}</strong>;
    else if (mark.type === 'em')    el = <em>{el}</em>;
    else if (mark.type === 'code')  el = <code style={{background:'#17181a', padding:'1px 5px', borderRadius:3, fontFamily:'monospace', fontSize:'0.85em'}}>{el}</code>;
    else if (mark.type === 'strike') el = <s>{el}</s>;
    else if (mark.type === 'underline') el = <u>{el}</u>;
    else if (mark.type === 'link') {
      const href = mark.attrs?.href ?? '#';
      el = <a href={href} target="_blank" rel="noreferrer" style={{color:'#60a5fa', textDecoration:'underline'}}>{el}</a>;
    }
  }
  return el;
};

const AdfNode = ({node, depth = 0}: {node: AdfNode; depth?: number}): React.ReactElement => {
  switch (node.type) {
    case 'doc':
    case 'taskList':
      return <>{(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}</>;

    case 'paragraph':
      return (
        <p style={{margin: '0 0 10px', lineHeight: 1.6, color: '#cdd0d5'}}>
          {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}
        </p>
      );

    case 'text':
      return <AdfText node={node} />;

    case 'hardBreak':
      return <br />;

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 2;
      const sizes: Record<number, string> = {1:'1.2rem', 2:'1.05rem', 3:'0.95rem', 4:'0.88rem', 5:'0.83rem', 6:'0.8rem'};
      return React.createElement(
        `h${level}`,
        {style: {fontSize: sizes[level] ?? '1rem', fontWeight: 700, color: '#dce0e3', margin: '16px 0 8px'}},
        (node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />),
      );
    }

    case 'bulletList':
      return (
        <ul style={{margin: '0 0 10px', paddingLeft: 20, color: '#cdd0d5'}}>
          {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth + 1} />)}
        </ul>
      );

    case 'orderedList':
      return (
        <ol style={{margin: '0 0 10px', paddingLeft: 20, color: '#cdd0d5'}}>
          {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth + 1} />)}
        </ol>
      );

    case 'listItem':
      return (
        <li style={{marginBottom: 4}}>
          {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}
        </li>
      );

    case 'taskItem':
      return (
        <li style={{marginBottom: 4, listStyle: 'none'}}>
          <input type="checkbox" readOnly checked={node.attrs?.state === 'done'} style={{marginRight: 6}} />
          {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}
        </li>
      );

    case 'codeBlock': {
      const lang = node.attrs?.language as string | undefined;
      return (
        <pre style={{background:'#17181a', border:'1px solid #34373d', borderRadius:6, padding:'10px 14px', overflowX:'auto', margin:'0 0 10px'}}>
          {lang && <div style={{fontSize:'0.65rem', color:'#676b71', marginBottom:6, fontFamily:'monospace'}}>{lang}</div>}
          <code style={{fontFamily:"'JetBrains Mono','Fira Code',Consolas,monospace", fontSize:'0.82rem', color:'#cdd0d5'}}>
            {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}
          </code>
        </pre>
      );
    }

    case 'blockquote':
      return (
        <blockquote style={{borderLeft:'3px solid #34373d', margin:'0 0 10px', paddingLeft:12, color:'#9fa1a7'}}>
          {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}
        </blockquote>
      );

    case 'rule':
      return <hr style={{border:'none', borderTop:'1px solid #34373d', margin:'12px 0'}} />;

    case 'mention':
      return <span style={{background:'rgba(59,130,246,0.15)', color:'#60a5fa', borderRadius:3, padding:'1px 4px', fontSize:'0.85em'}}>@{(node.attrs?.text as string) ?? (node.attrs?.id as string) ?? 'user'}</span>;

    case 'emoji':
      return <span>{(node.attrs?.text as string) ?? ''}</span>;

    case 'inlineCard':
    case 'blockCard': {
      const url = node.attrs?.url as string | undefined;
      const match = url?.match(/browse\/([A-Z]+-\d+)/);
      const label = match ? match[1] : (url ?? 'link');
      return <a href={url} target="_blank" rel="noreferrer" style={{color:'#60a5fa', fontSize:'0.82em', fontFamily:'monospace'}}>{label}</a>;
    }

    case 'panel': {
      const panelColors: Record<string, {bg: string; border: string; icon: string}> = {
        info:    {bg:'rgba(59,130,246,0.08)', border:'rgba(59,130,246,0.2)', icon:'ℹ'},
        note:    {bg:'rgba(59,130,246,0.08)', border:'rgba(59,130,246,0.2)', icon:'📝'},
        warning: {bg:'rgba(255,196,0,0.08)',  border:'rgba(255,196,0,0.2)',  icon:'⚠'},
        error:   {bg:'rgba(239,68,68,0.08)',  border:'rgba(239,68,68,0.2)',  icon:'✖'},
        success: {bg:'rgba(74,222,128,0.08)', border:'rgba(74,222,128,0.2)', icon:'✓'},
      };
      const pt = (node.attrs?.panelType as string) ?? 'info';
      const pc = panelColors[pt] ?? panelColors['info'];
      return (
        <div style={{background:pc.bg, border:`1px solid ${pc.border}`, borderRadius:6, padding:'10px 14px', margin:'0 0 10px', display:'flex', gap:8}}>
          <span style={{flexShrink:0}}>{pc.icon}</span>
          <div>{(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}</div>
        </div>
      );
    }

    case 'table':
      return (
        <div style={{overflowX:'auto', margin:'0 0 10px'}}>
          <table style={{borderCollapse:'collapse', width:'100%', fontSize:'0.82rem', color:'#cdd0d5'}}>
            <tbody>
              {(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}
            </tbody>
          </table>
        </div>
      );

    case 'tableRow':
      return <tr>{(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}</tr>;

    case 'tableHeader':
    case 'tableCell': {
      const Tag = node.type === 'tableHeader' ? 'th' : 'td';
      return <Tag style={{border:'1px solid #34373d', padding:'6px 10px', textAlign:'left', fontWeight: node.type === 'tableHeader' ? 700 : 400}}>{(node.content ?? []).map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}</Tag>;
    }

    default:
      // Unknown node: render children if any, otherwise nothing
      if (node.content?.length) {
        return <>{node.content.map((c, i) => <AdfNode key={i} node={c} depth={depth} />)}</>;
      }
      return <></>;
  }
};

// ─── Sidebar field row ────────────────────────────────────────────────────────

const SidebarField = ({label, children}: {label: string; children: React.ReactNode}) => (
  <div style={{marginBottom: 16}}>
    <div style={{fontSize:'0.63rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#54585f', marginBottom:5}}>{label}</div>
    <div style={{fontSize:'0.82rem', color:'#cdd0d5'}}>{children}</div>
  </div>
);

const Avatar = ({user, size = 20}: {user: JiraUser; size?: number}) => (
  <div style={{display:'flex', alignItems:'center', gap:7}}>
    <img src={user.avatarUrls['24x24']} alt="" width={size} height={size} style={{borderRadius:'50%', flexShrink:0}} />
    <span>{user.displayName}</span>
  </div>
);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', hour:'2-digit', minute:'2-digit'});

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  issueKey:        string;
  onBack:          () => void;
  problems:        JiraProblemRecord[];
  /** Called after a successful fix so the parent can re-sync its ticket list. */
  onRefresh?:      () => Promise<void>;
  /** Current summary from the parent's cached ticket — used to seed the title fix. */
  currentSummary?: string;
}

export const JiraIssueDetail = ({issueKey, onBack, problems, onRefresh, currentSummary}: Props) => {
  const {aiSettings} = useAi();
  const [fields, setFields]   = useState<JiraDetailFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const jiraUrl = `https://wearezeta.atlassian.net/browse/${issueKey}`;

  const fetchIssue = useCallback(async () => {
    const [email, pat] = await Promise.all([aiSettings.getJiraEmail(), aiSettings.getJiraPat()]);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/proxy/jira/rest/api/3/issue/${issueKey}?fields=summary,description,status,priority,assignee,reporter,issuetype,labels,components,fixVersions,customfield_10004,created,updated,comment,subtasks,parent`,
        {headers: {'X-Jira-Email': email ?? '', 'X-Jira-Token': pat ?? '', 'Accept': 'application/json'}},
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Jira returned ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = await response.json() as {fields: JiraDetailFields};
      setFields(data.fields);
    } catch (err) {
      log.error('Failed to fetch issue', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [aiSettings, issueKey]);

  useEffect(() => { void fetchIssue(); }, [fetchIssue]);

  // After a fix: re-fetch the displayed issue AND trigger parent re-sync for problems
  const afterFix = useCallback(async () => {
    await Promise.all([
      fetchIssue(),
      onRefresh?.(),
    ]);
  }, [fetchIssue, onRefresh]);

  const {fixTitle, fixStoryPoints, addComment} = useJiraFix(afterFix);

  // Resolve the best current summary: live fetched fields take priority over cached prop
  const effective_summary = fields?.summary ?? currentSummary ?? '';

  // ── Layout styles ──────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {display:'flex', flexDirection:'column', height:'100%', background:'#17181a', overflow:'hidden'};

  const topBarStyle: React.CSSProperties = {
    padding:       '12px 20px',
    borderBottom:  '1px solid #34373d',
    display:       'flex',
    alignItems:    'center',
    gap:           10,
    flexShrink:    0,
    background:    '#1f2023',
  };

  const backBtnStyle: React.CSSProperties = {
    padding:      '4px 12px',
    background:   'transparent',
    border:       '1px solid #34373d',
    borderRadius: '6px',
    color:        '#9fa1a7',
    cursor:       'pointer',
    fontSize:     '0.77rem',
    display:      'flex',
    alignItems:   'center',
    gap:          5,
  };

  const issuekeyBadgeStyle: React.CSSProperties = {
    fontFamily:  "'JetBrains Mono',Consolas,monospace",
    fontSize:    '0.78rem',
    fontWeight:  700,
    color:       '#60a5fa',
    letterSpacing: '0.04em',
  };

  const openUrlBtnStyle: React.CSSProperties = {
    marginLeft:   'auto',
    padding:      '4px 12px',
    background:   'transparent',
    border:       '1px solid #34373d',
    borderRadius: '6px',
    color:        '#9fa1a7',
    cursor:       'pointer',
    fontSize:     '0.77rem',
    display:      'flex',
    alignItems:   'center',
    gap:          5,
    textDecoration: 'none',
  };

  const bodyStyle: React.CSSProperties = {flex:1, overflowY:'auto', padding:'20px 20px'};

  const twoColStyle: React.CSSProperties = {display:'flex', gap:24, alignItems:'flex-start'};
  const mainColStyle: React.CSSProperties = {flex:1, minWidth:0};
  const sidebarColStyle: React.CSSProperties = {width:220, flexShrink:0};

  const sectionHeadStyle: React.CSSProperties = {
    fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#54585f', marginBottom: 10,
    paddingBottom: 6, borderBottom: '1px solid #2c2d31',
  };

  const errorStyle: React.CSSProperties = {
    background:'rgba(239,68,68,0.08)', border:'1px solid rgba(248,113,113,0.25)',
    borderRadius:8, padding:'14px 16px', color:'#fca5a5', fontSize:'0.82rem',
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* Top bar */}
      <div style={topBarStyle}>
        <button style={backBtnStyle} onClick={onBack}>
          ← Back
        </button>
        {fields && (
          <img
            src={fields.issuetype.iconUrl}
            alt={fields.issuetype.name}
            width={16} height={16}
            style={{flexShrink:0}}
          />
        )}
        <span style={issuekeyBadgeStyle}>{issueKey}</span>
        <a
          href={jiraUrl}
          target="_blank"
          rel="noreferrer"
          style={openUrlBtnStyle}
          title="Open in Jira"
        >
          <EarthIcon /> Open in Jira
        </a>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        {loading && (
          <div style={{textAlign:'center', color:'#676b71', padding:'48px 0'}}>Loading…</div>
        )}

        {error && <div style={errorStyle}><strong>Failed to load</strong><br />{error}</div>}

        {fields && !loading && (
          <>
            {/* Title */}
            <h1 style={{fontSize:'1.15rem', fontWeight:700, color:'#dce0e3', margin:'0 0 20px', lineHeight:1.35}}>
              <JiraLinkText text={fields.summary} />
            </h1>

            <div style={twoColStyle}>
              {/* ── Main column ────────────────────────────────────────────── */}
              <div style={mainColStyle}>

                {/* Description */}
                <div style={{marginBottom: 28}}>
                  <div style={sectionHeadStyle}>Description</div>
                  {fields.description
                    ? <AdfNode node={fields.description} />
                    : <p style={{color:'#54585f', fontStyle:'italic', fontSize:'0.82rem'}}>No description provided.</p>
                  }
                </div>

                {/* Subtasks */}
                {fields.subtasks.length > 0 && (
                  <div style={{marginBottom: 28}}>
                    <div style={sectionHeadStyle}>Child Issues ({fields.subtasks.length})</div>
                    {fields.subtasks.map(sub => (
                      <div key={sub.key} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #2c2d31'}}>
                        <span style={{fontFamily:'monospace', fontSize:'0.72rem', color:'#60a5fa', fontWeight:700}}>{sub.key}</span>
                        <span style={{flex:1, fontSize:'0.82rem', color:'#cdd0d5'}}><JiraLinkText text={sub.fields.summary} /></span>
                        <span style={statusChipStyle(sub.fields.status.statusCategory.colorName)}>{sub.fields.status.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments */}
                <div>
                  <div style={sectionHeadStyle}>
                    Comments {fields.comment.total > 0 ? `(${fields.comment.total})` : ''}
                  </div>
                  {fields.comment.comments.length === 0
                    ? <p style={{color:'#54585f', fontStyle:'italic', fontSize:'0.82rem'}}>No comments yet.</p>
                    : fields.comment.comments.map(c => (
                      <div key={c.id} style={{marginBottom:16, background:'#26272c', border:'1px solid #34373d', borderRadius:8, padding:'12px 14px'}}>
                        <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                          <img src={c.author.avatarUrls['24x24']} alt="" width={20} height={20} style={{borderRadius:'50%'}} />
                          <span style={{fontSize:'0.8rem', fontWeight:600, color:'#dce0e3'}}>{c.author.displayName}</span>
                          <span style={{fontSize:'0.67rem', color:'#54585f', marginLeft:'auto'}}>{fmtDateTime(c.created)}</span>
                        </div>
                        <div style={{fontSize:'0.82rem'}}>
                          <AdfNode node={c.body} />
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* ── Sidebar ────────────────────────────────────────────────── */}
              <div style={sidebarColStyle}>
                <SidebarField label="Status">
                  <span style={statusChipStyle(fields.status.statusCategory.colorName)}>{fields.status.name}</span>
                </SidebarField>

                {fields.assignee && (
                  <SidebarField label="Assignee">
                    <Avatar user={fields.assignee} />
                  </SidebarField>
                )}

                {fields.reporter && (
                  <SidebarField label="Reporter">
                    <Avatar user={fields.reporter} />
                  </SidebarField>
                )}

                {fields.priority && (
                  <SidebarField label="Priority">
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <img src={fields.priority.iconUrl} alt="" width={14} height={14} />
                      {fields.priority.name}
                    </div>
                  </SidebarField>
                )}

                {fields.customfield_10004 != null && (
                  <SidebarField label="Story Points">
                    {fields.customfield_10004}
                  </SidebarField>
                )}

                {fields.labels.length > 0 && (
                  <SidebarField label="Labels">
                    <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                      {fields.labels.map(l => (
                        <span key={l} style={{background:'rgba(99,115,129,0.18)', color:'#9fa1a7', borderRadius:4, padding:'2px 7px', fontSize:'0.72rem'}}>{l}</span>
                      ))}
                    </div>
                  </SidebarField>
                )}

                {fields.components.length > 0 && (
                  <SidebarField label="Components">
                    <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                      {fields.components.map(c => (
                        <span key={c.name} style={{background:'rgba(99,115,129,0.18)', color:'#9fa1a7', borderRadius:4, padding:'2px 7px', fontSize:'0.72rem'}}>{c.name}</span>
                      ))}
                    </div>
                  </SidebarField>
                )}

                {fields.fixVersions.length > 0 && (
                  <SidebarField label="Fix Versions">
                    {fields.fixVersions.map(v => v.name).join(', ')}
                  </SidebarField>
                )}

                {fields.parent && (
                  <SidebarField label="Parent">
                    <span style={{fontFamily:'monospace', fontSize:'0.78rem', color:'#60a5fa'}}>{fields.parent.key}</span>
                    <div style={{fontSize:'0.78rem', color:'#9fa1a7', marginTop:2}}><JiraLinkText text={fields.parent.fields.summary} /></div>
                  </SidebarField>
                )}

                {problems.length > 0 && (
                  <SidebarField label="Problems">
                    <ProblemPills
                      problems={problems}
                      onFixTitle={async (area, product) => fixTitle(issueKey, effective_summary, area, product)}
                      onFixStoryPoints={async (points) => fixStoryPoints(issueKey, points)}
                      onAddComment={async (text) => addComment(issueKey, text)}
                    />
                  </SidebarField>
                )}

                <SidebarField label="Created">{fmtDate(fields.created)}</SidebarField>
                <SidebarField label="Updated">{fmtDate(fields.updated)}</SidebarField>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Earth icon ───────────────────────────────────────────────────────────────

const EarthIcon = () => (
  <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{flexShrink:0}}>
    <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1C7.5 1 5 4 5 7.5C5 11 7.5 14 7.5 14" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7.5 1C7.5 1 10 4 10 7.5C10 11 7.5 14 7.5 14" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1 7.5H14" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.8 4.5H13.2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1.8 10.5H13.2" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
);
