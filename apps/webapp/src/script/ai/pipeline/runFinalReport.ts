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

import {FinalReportToolArgsSchema} from '../domain/EntryTypes';
import {OllamaToolCallMissingError, OllamaToolCallInvalidError} from '../ollama/errors';
import type {OllamaClient} from '../ollama/OllamaClient';
import {FINAL_REPORT_TOOL} from '../ollama/OllamaClient';
import type {PromptService} from '../prompts/PromptService';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {AiStorageRepository} from '../storage/AiStorageRepository';

/**
 * Arguments for runFinalReport.
 * @param reportId Report to persist final entries into.
 * @param aiStorage Loads sub-reports, persists final entries.
 * @param aiSettings Reads job description.
 * @param prompts Renders final_report template.
 * @param ollama LLM client.
 * @param signal Abort signal for pause control.
 */
export interface RunFinalReportArgs {
  reportId: string;
  aiStorage: AiStorageRepository;
  aiSettings: AiSettingsService;
  prompts: PromptService;
  ollama: OllamaClient;
  signal: AbortSignal;
}

/**
 * Runs the final-report merge pass: load done sub-reports → render prompt → call LLM → parse → persist final entries.
 * Does NOT delete stale entries before writing; caller must delete via deleteFinalEntries before invoking (D25).
 * Throws OllamaToolCallMissingError / OllamaToolCallInvalidError on LLM failure;
 * caller catches and sets status=interrupted while preserving final_pass_started_at (D21).
 */
export const runFinalReport = async (args: RunFinalReportArgs): Promise<void> => {
  const {reportId, aiStorage, aiSettings, prompts, ollama, signal} = args;
  const settings = await aiSettings.getAll();
  const subs = (await aiStorage.listSubReports(reportId)).filter(s => s.status === 'done');

  if (subs.length === 0) {
    return;
  }

  const conversationsVar = subs.map(s => ({
    id: s.conversation_id,
    name: s.conversation_name_snapshot,
    kind: 'group' as const,
    ai_description: s.ai_description_snapshot,
    entries_json: JSON.stringify(s.entries, null, 2),
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
    typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments;
  const parse = FinalReportToolArgsSchema.safeParse(rawArgs);
  if (!parse.success) {
    throw new OllamaToolCallInvalidError(parse.error.issues);
  }

  const records = parse.data.entries.map(entry => ({
    id: crypto.randomUUID(),
    report_id: reportId,
    type: entry.type,
    payload: entry,
    conversation_ids: entry.conversation_ids,
    mutable_state: {},
    created_at: new Date().toISOString(),
  }));
  await aiStorage.putFinalEntries(reportId, records);
};
