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

import type {EntryPayload, FinalEntry} from '../domain/EntryTypes';
import {FinalReportToolArgsSchema} from '../domain/EntryTypes';
import {OllamaToolCallInvalidError, OllamaToolCallMissingError} from '../ollama/errors';
import {FINAL_REPORT_TOOL} from '../ollama/OllamaClient';
import type {OllamaClient} from '../ollama/OllamaClient';
import type {PromptService} from '../prompts/PromptService';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {AiStorageRepository} from '../storage/AiStorageRepository';
import type {AiFinalReportEntryRecord} from '../storage/records/AiFinalReportEntryRecord';

/** Arguments for the final-merge report run. */
export interface RunFinalReportArgs {
  reportId: string;
  aiStorage: AiStorageRepository;
  aiSettings: AiSettingsService;
  prompts: PromptService;
  ollama: OllamaClient;
  signal: AbortSignal;
}

/**
 * Runs the final-merge LLM pass: gathers all 'done' sub-reports, renders the final prompt,
 * calls Ollama, validates, and persists the resulting AiFinalReportEntryRecord rows.
 */
export const runFinalReport = async (args: RunFinalReportArgs): Promise<void> => {
  const {reportId, aiStorage, aiSettings, prompts, ollama, signal} = args;
  const settings = await aiSettings.getAll();

  const subs = (await aiStorage.listSubReports(reportId)).filter(s => s.status === 'done');

  // Snapshot existing final entries before the run so we can carry over mutable_state
  // (user-edited titles, descriptions, notes, checked state) when the LLM re-emits the same entry.
  const existing_final_entries = await aiStorage.listFinalEntries(reportId);

  const conversationsVar = subs.map(s => ({
    id: s.conversation_id,
    name: s.conversation_name_snapshot,
    kind: 'group',
    ai_description: s.ai_description_snapshot,
    // Exclude entries the user has marked hidden — they shouldn't influence the final report
    entries_json: JSON.stringify(
      s.entries.filter(entry => (s.entry_statuses?.[entry.id] ?? 'pending') !== 'hidden'),
      null,
      2,
    ),
  }));

  const prompt = await prompts.render('final_report', {
    user_job_description: settings.jobDescription,
    conversations: conversationsVar,
    example_tool_call_json: JSON.stringify(
      {
        entries: [
          {
            type: 'report',
            participants: [],
            description: '...',
            start: '2026-01-01T00:00:00.000Z',
            end: '2026-01-01T01:00:00.000Z',
            conversation_ids: ['<convo-id>'],
          },
          {
            type: 'todo',
            title: '...',
            description: '...',
            created_at: '2026-01-01T00:00:00.000Z',
            conversation_ids: ['<convo-id>'],
          },
          {
            type: 'ticket',
            title: '...',
            description: '...',
            created_at: '2026-01-01T00:00:00.000Z',
            conversation_ids: ['<convo-id>'],
          },
        ],
      },
      null,
      2,
    ),
    iso_now: new Date().toISOString(),
  });

  const response = await ollama.chat({
    messages: [{role: 'user', content: prompt}],
    tools: [FINAL_REPORT_TOOL],
    toolChoice: 'auto',
    signal,
  });

  const call = response.message.tool_calls?.[0];
  if (!call) {
    throw new OllamaToolCallMissingError();
  }

  const rawArgs =
    typeof call.function.arguments === 'string'
      ? JSON.parse(call.function.arguments as string)
      : call.function.arguments;

  const parse = FinalReportToolArgsSchema.safeParse(rawArgs);
  if (!parse.success) {
    throw new OllamaToolCallInvalidError(parse.error.issues);
  }

  const records = parse.data.entries.map(entry => {
    // For each source conversation, find the best source_timestamp from its sub-report entries.
    const source_refs = entry.conversation_ids.flatMap(conv_id => {
      const sub = subs.find(s => s.conversation_id === conv_id);
      if (!sub) return [];
      const matching = sub.entries.find(e => e.type === entry.type);
      const timestamp = matching?.source_timestamp ?? sub.stats.started_at ?? sub.created_at;
      return [{conversation_id: conv_id, domain: sub.conversation_domain, timestamp}];
    });

    const matched = find_matching_final_entry(entry, existing_final_entries);

    return {
      id: matched?.id ?? crypto.randomUUID(),
      report_id: reportId,
      type: entry.type,
      status: matched?.status ?? ('pending' as const),
      payload: entry,
      conversation_ids: entry.conversation_ids,
      source_refs,
      mutable_state: matched?.mutable_state ?? {},
      created_at: matched?.created_at ?? new Date().toISOString(),
    };
  });

  await aiStorage.putFinalEntries(reportId, records);
};

/**
 * Normalises an entry payload to a short content key for fuzzy identity matching.
 * Reports are identified by description prefix; todos and tickets by title.
 */
function normalize_entry_key(payload: EntryPayload): string {
  if (payload.type === 'report') {
    return payload.description.toLowerCase().trim().slice(0, 100);
  }
  return payload.title.toLowerCase().trim().slice(0, 100);
}

/**
 * Tries to find an existing AiFinalReportEntryRecord that corresponds to a newly-emitted entry
 * so we can preserve its mutable_state (user edits) across final-pass re-runs.
 * Matches on (type, sorted conversation_ids). When multiple candidates share the same type+convs
 * we further narrow by normalised content key; otherwise take the single candidate.
 */
function find_matching_final_entry(
  entry: FinalEntry,
  existing: AiFinalReportEntryRecord[],
): AiFinalReportEntryRecord | undefined {
  const sorted_ids = entry.conversation_ids.slice().sort().join(',');

  const candidates = existing.filter(e => {
    if (e.type !== entry.type) {
      return false;
    }
    return e.conversation_ids.slice().sort().join(',') === sorted_ids;
  });

  if (candidates.length === 0) {
    return undefined;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  const new_key = normalize_entry_key(entry);
  return candidates.find(c => normalize_entry_key(c.payload) === new_key) ?? candidates[0];
}
