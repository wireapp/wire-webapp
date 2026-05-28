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

/** Default Handlebars template for per-conversation sub-report prompts. */
export const DEFAULT_SUB_REPORT_TEMPLATE = `<role>
You extract structured signal from a single Wire conversation transcript. Your output is consumed by another LLM that will merge multiple per-conversation outputs into a final report. Prefer precision over recall: it is better to return zero entries than to return noise.
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

<task>
Extract entries from the transcript below. There are three entry types:

Every entry must include a \`source_timestamp\` field: the ISO 8601 form of the \`[YYYY-MM-DD HH:mm]\` prefix of the transcript line that most directly caused you to extract this entry (e.g. \`[2026-01-15 14:32]\` → \`"2026-01-15T14:32:00.000Z"\`). Do not invent or estimate — copy from the transcript.

1. **report** — a self-contained summary of one subject/task/event in the conversation that is relevant to the user's job.
   Fields: participants[], description, start (ISO), end (ISO), source_timestamp (ISO).
2. **todo** — a future action the user should take, derived from things they (or others, when addressed to them) committed to.
   Fields: title, description, created_at (ISO), source_timestamp (ISO).
3. **ticket** — a ticket draft, ONLY when somebody in the conversation explicitly suggested creating a ticket/issue.
   Fields: title, description, created_at (ISO), source_timestamp (ISO).

Filtering rules — REJECT entries that are:
- Not relevant to the user's job (per the description above).
- About other people's responsibilities that the user is not on the hook for.
- Pure social chatter or personal life.
- Vague aspirational statements without a clear subject.

Return your output by calling the \`report_completion\` tool. If nothing is relevant, return \`{"entries": []}\`.
</task>

<output_format_example>
{{{example_tool_call_json}}}
</output_format_example>

<transcript>
{{transcript}}
</transcript>
`;
