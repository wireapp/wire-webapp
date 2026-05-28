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

import type {Conversation} from 'Repositories/entity/Conversation';
import type {EventService} from 'Repositories/event/EventService';
import type {EventRecord} from 'Repositories/storage/record/EventRecord';

import type {StoredEntry} from '../domain/EntryTypes';
import {SubReportIncrementalToolArgsSchema} from '../domain/EntryTypes';
import {OllamaToolCallInvalidError, OllamaToolCallMissingError} from '../ollama/errors';
import {SUB_REPORT_INCREMENTAL_TOOL} from '../ollama/OllamaClient';
import type {OllamaClient} from '../ollama/OllamaClient';
import type {PromptService} from '../prompts/PromptService';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {AiStorageRepository} from '../storage/AiStorageRepository';
import type {AiConversationSubReportRecord} from '../storage/records';
import {computeBudget} from '../tokenizer/budget';
import {countTokens} from '../tokenizer/tokenize';
import {truncateTranscript} from '../tokenizer/truncate';
import {buildTranscriptLines, type SelfUserInfo} from '../transcript/buildTranscript';

/** Placeholder injected into the incremental prompt to measure overhead without the real transcript. */
const TRANSCRIPT_PLACEHOLDER = '__TRANSCRIPT_PLACEHOLDER__';
/** Placeholder injected into the incremental prompt to measure overhead without the existing-entries XML. */
const EXISTING_ENTRIES_PLACEHOLDER = '__EXISTING_ENTRIES_PLACEHOLDER__';

/** Arguments for a single incremental sub-report run. */
export interface RunSubReportIncrementalArgs {
  sub: AiConversationSubReportRecord;
  previousEntries: StoredEntry[];
  conversation: Conversation;
  selfUser: SelfUserInfo;
  aiStorage: AiStorageRepository;
  aiSettings: AiSettingsService;
  prompts: PromptService;
  ollama: OllamaClient;
  eventService: EventService;
  signal: AbortSignal;
  onStage: (stage: string) => void;
}

/**
 * Serialises the previous sub-report entries as XML for the incremental prompt context.
 * Marks entries that the user has explicitly reviewed (entry_statuses != 'pending') with
 * user_edited="true" so the LLM is appropriately conservative about overwriting them.
 */
function build_existing_entries_xml(
  entries: StoredEntry[],
  entry_statuses: Record<string, string> | undefined,
): string {
  if (entries.length === 0) {
    return '<empty/>';
  }

  const lines: string[] = [];
  for (const entry of entries) {
    const status = entry_statuses?.[entry.id] ?? 'pending';
    const user_edited = status !== 'pending' ? ' user_edited="true"' : '';

    lines.push(`  <entry id="${entry.id}" type="${entry.type}" source_timestamp="${entry.source_timestamp}"${user_edited}>`);

    if (entry.type === 'report') {
      lines.push(`    <description>${escape_xml(entry.description)}</description>`);
      lines.push(`    <start>${entry.start}</start>`);
      lines.push(`    <end>${entry.end}</end>`);
    } else if (entry.type === 'todo') {
      lines.push(`    <title>${escape_xml(entry.title)}</title>`);
      lines.push(`    <description>${escape_xml(entry.description)}</description>`);
    } else if (entry.type === 'ticket') {
      lines.push(`    <title>${escape_xml(entry.title)}</title>`);
      lines.push(`    <description>${escape_xml(entry.description)}</description>`);
    }

    lines.push('  </entry>');
  }

  return lines.join('\n');
}

function escape_xml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Processes a single conversation sub-report incrementally:
 * passes the full transcript AND the previously-extracted entries to the LLM, which may
 * create new entries or update existing ones. Entries not referenced by the LLM are preserved.
 */
export const runSubReportIncremental = async (args: RunSubReportIncrementalArgs): Promise<void> => {
  const {sub, previousEntries, conversation, selfUser, aiStorage, aiSettings, prompts, ollama, eventService, signal, onStage} = args;
  const settings = await aiSettings.getAll();

  onStage('Loading events');
  const events = (await eventService.loadPrecedingEvents(
    conversation.id,
    new Date(0),
    new Date(),
    5000,
  )) as EventRecord[];

  onStage('Building transcript');
  const lines = buildTranscriptLines(conversation, events, selfUser);
  const line_strings = lines.map(l => l.text);
  const raw_tokens = countTokens(line_strings.join('\n'));

  const users = conversation.participating_user_ets();
  const participants = users.map(u => ({
    name: (u.name as (() => string) | undefined)?.() ?? '',
    handle: (u as {handle?: string}).handle ?? '',
    qualified_id: u.qualifiedId,
  }));
  const conversation_kind = conversation.is1to1?.() ? '1-to-1' : conversation.isChannel?.() ? 'channel' : 'group';

  // Build existing-entries XML from the previous sub-report's stored entries.
  // entry_statuses lives on the root of the reuse chain; sub.entry_statuses is already
  // the resolved overlay from AiStorageRepository.listSubReports.
  const existing_entries_xml = build_existing_entries_xml(previousEntries, sub.entry_statuses);
  const existing_entries_tokens = countTokens(existing_entries_xml);

  // Measure prompt overhead with both variable sections replaced by placeholders.
  const overhead_vars = {
    self_user_name: selfUser.name,
    self_user_handle: selfUser.handle,
    user_job_description: settings.jobDescription,
    conversation_name: conversation.display_name(),
    conversation_kind,
    participants,
    ai_description: sub.ai_description_snapshot,
    transcript: TRANSCRIPT_PLACEHOLDER,
    existing_entries_xml: EXISTING_ENTRIES_PLACEHOLDER,
    example_tool_call_json: '{}',
    iso_now: new Date().toISOString(),
  };

  const rendered_overhead = await prompts.render('sub_report_incremental', overhead_vars);
  const overhead_tokens =
    countTokens(rendered_overhead.replace(TRANSCRIPT_PLACEHOLDER, '').replace(EXISTING_ENTRIES_PLACEHOLDER, '')) +
    existing_entries_tokens;

  const report_row = await aiStorage.getReport(sub.report_id);
  const context_size = report_row?.snapshot.context_size ?? settings.manualContextSize;

  const budget = computeBudget({
    contextSize: context_size,
    promptOverheadTokens: overhead_tokens,
    safetyMarginPct: settings.safetyMarginPct,
  });

  onStage('Applying token budget');
  const trunc = truncateTranscript(line_strings, budget.forTranscript, settings.perMessageTokenCap);
  const truncated_transcript = trunc.lines.join('\n');
  const truncated_tokens = countTokens(truncated_transcript);

  onStage('Calling LLM');
  const final_prompt = await prompts.render('sub_report_incremental', {
    ...overhead_vars,
    transcript: truncated_transcript,
    existing_entries_xml,
    example_tool_call_json: JSON.stringify(
      {
        actions: [
          {
            op: 'create',
            entry: {
              type: 'todo',
              title: '...',
              description: '...',
              created_at: '2026-01-01T00:00:00.000Z',
              source_timestamp: '2026-01-01T00:00:00.000Z',
            },
          },
          {
            op: 'update',
            id: '<existing-entry-id>',
            entry: {
              type: 'report',
              participants: [],
              description: '...',
              start: '2026-01-01T00:00:00.000Z',
              end: '2026-01-01T01:00:00.000Z',
              source_timestamp: '2026-01-01T00:00:00.000Z',
            },
          },
        ],
      },
      null,
      2,
    ),
  });

  const response = await ollama.chat({
    messages: [{role: 'user', content: final_prompt}],
    tools: [SUB_REPORT_INCREMENTAL_TOOL],
    toolChoice: 'auto',
    numCtx: context_size,
    signal,
  });

  onStage('Parsing tool call');
  const call = response.message.tool_calls?.[0];
  if (!call) {
    throw new OllamaToolCallMissingError();
  }

  const raw_args =
    typeof call.function.arguments === 'string'
      ? JSON.parse(call.function.arguments as string)
      : call.function.arguments;

  const parse = SubReportIncrementalToolArgsSchema.safeParse(raw_args);
  if (!parse.success) {
    throw new OllamaToolCallInvalidError(parse.error.issues);
  }

  onStage('Applying actions');
  const known_ids = new Set(previousEntries.map(e => e.id));

  // Start from the previous entries and apply the LLM's actions on top.
  const result_entries: StoredEntry[] = [...previousEntries];

  for (const action of parse.data.actions) {
    if (action.op === 'create') {
      result_entries.push({...action.entry, id: crypto.randomUUID()});
    } else if (action.op === 'update') {
      if (!known_ids.has(action.id)) {
        // LLM hallucinated an id that doesn't exist — skip silently rather than corrupt state.
        continue;
      }
      const idx = result_entries.findIndex(e => e.id === action.id);
      if (idx >= 0) {
        result_entries[idx] = {...action.entry, id: action.id};
      }
    }
  }

  await aiStorage.updateSubReport(sub.id, {
    status: 'done',
    entries: result_entries,
    stats: {
      ...sub.stats,
      raw_token_estimate: raw_tokens,
      truncated_token_estimate: truncated_tokens,
      message_count_before_truncation: line_strings.length,
      message_count_after_truncation: trunc.lines.length,
      started_at: sub.stats.started_at,
      finished_at: new Date().toISOString(),
    },
  });
};
