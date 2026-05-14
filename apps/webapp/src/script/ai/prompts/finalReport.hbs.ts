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

export const DEFAULT_FINAL_REPORT_TEMPLATE = `<role>
You are the final-merge stage. You receive per-conversation extractions and produce a single, clean, deduplicated report.
</role>

<user_context>
"""
{{user_job_description}}
"""
</user_context>

<task>
For each entry in the final output, you MUST set \`conversation_ids\` to the list of conversation IDs that the entry was derived from (one entry can span multiple conversations if you merge duplicates).

Operations you should perform:
- DEDUPE: collapse near-duplicate entries into one (combine descriptions, union participants/ids).
- DROP: remove entries that look like noise on second look.
- MERGE: combine partial information about the same subject across conversations.
- IMPROVE: rewrite descriptions for clarity.
- DO NOT invent new content. Only restructure / rewrite existing content.

Return your output by calling the \`report_completion\` tool. If nothing relevant survives, return \`{"entries": []}\`.
</task>

<output_format_example>
{{{example_tool_call_json}}}
</output_format_example>

<conversations>
{{#each conversations}}
<conversation id="{{id}}" name="{{name}}" kind="{{kind}}">
{{#if ai_description}}<user_context>{{ai_description}}</user_context>{{/if}}
<entries_json>
{{{entries_json}}}
</entries_json>
</conversation>
{{/each}}
</conversations>
`;
