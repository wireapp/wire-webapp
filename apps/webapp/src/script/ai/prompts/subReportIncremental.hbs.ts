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

/** Default Handlebars template for incremental (re-scan) per-conversation sub-report prompts. */
export const DEFAULT_SUB_REPORT_INCREMENTAL_TEMPLATE = `<role>
You are updating an existing extraction for a single Wire conversation. A previous scan already produced the entries shown in <existing_entries>. Your job is to review the full transcript and emit only the changes needed — do not re-emit unchanged entries.
</role>

<self_user>
The report is being generated for: {{self_user_name}} (@{{self_user_handle}}).
This is the person whose perspective matters. When writing entry descriptions, always refer to this person as "the user" or as "{{self_user_name}}" — never as "the other person" or by any anonymous label.
</self_user>

<user_context>
The end user reading this report describes their job as:
"""
{{user_job_description}}
"""
{{#unless user_job_description}}
(The user did not provide a job description. In this case, treat anything that looks like a work-related task, decision, or commitment as relevant.)
{{/unless}}
</user_context>

<conversation_metadata>
Name: {{conversation_name}}
Kind: {{conversation_kind}}
Participants:
{{#each participants}}
- {{name}} (@{{handle}})
{{/each}}
{{#if ai_description}}
User-supplied context for this specific conversation:
"""
{{ai_description}}
"""
{{/if}}
Current time: {{iso_now}}
</conversation_metadata>

<existing_entries>
{{{existing_entries_xml}}}
</existing_entries>

<task>
You are given the full conversation transcript below and the entries extracted during the previous scan above.

Rules for emitting actions:
1. **No action needed** — if an existing entry is still accurate and the transcript contains nothing new about it, emit nothing for it.
2. **op: "update"** — if new messages materially change or extend an existing entry, emit an update action with the entry's \`id\` exactly as shown in <existing_entries>. Rewrite the full entry with the updated content.
3. **op: "create"** — if the transcript contains a genuinely new report topic, todo, or ticket not covered by any existing entry, emit a create action.

Entry types (same as before):
1. **report** — a self-contained summary of one subject/task/event relevant to the user's job. Fields: participants[], description, start (ISO), end (ISO), source_timestamp (ISO).
2. **todo** — a future action the user should take. Fields: title, description, created_at (ISO), source_timestamp (ISO).
3. **ticket** — a ticket draft, ONLY when somebody explicitly suggested creating a ticket/issue. Fields: title, description, created_at (ISO), source_timestamp (ISO).

Every entry must include a \`source_timestamp\` field: the ISO 8601 form of the \`[YYYY-MM-DD HH:mm]\` prefix of the most relevant transcript line.

Entries marked \`user_edited="true"\` in <existing_entries> were manually reviewed or modified by the user. Only update these if the new messages contain clear, material information that contradicts or significantly extends the existing content.

Filtering rules — REJECT new entries that are:
- Not relevant to the user's job.
- About other people's responsibilities that the user is not on the hook for.
- Pure social chatter or personal life.
- Vague aspirational statements without a clear subject.
- Duplicates of existing entries (update instead).

Return your output by calling the \`report_completion\` tool. If nothing needs to change, return \`{"actions": []}\`.
</task>

<output_format_example>
{{{example_tool_call_json}}}
</output_format_example>

<transcript>
{{transcript}}
</transcript>
`;
