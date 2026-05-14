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

import {SubReportToolArgsSchema} from '../domain/EntryTypes';
import {OllamaToolCallMissingError, OllamaToolCallInvalidError} from '../ollama/errors';
import type {OllamaClient} from '../ollama/OllamaClient';
import {SUB_REPORT_TOOL} from '../ollama/OllamaClient';
import type {PromptService} from '../prompts/PromptService';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {AiStorageRepository} from '../storage/AiStorageRepository';
import type {AiConversationSubReportRecord} from '../storage/records';
import {computeBudget} from '../tokenizer/budget';
import {countTokens} from '../tokenizer/tokenize';
import {truncateTranscript} from '../tokenizer/truncate';
import {buildTranscriptLines} from '../transcript/buildTranscript';

const TRANSCRIPT_PLACEHOLDER = '__TRANSCRIPT_PLACEHOLDER__';

/**
 * Arguments for runSubReport.
 * @param sub Sub-report record to populate.
 * @param conversation Conversation being analyzed.
 * @param aiStorage Persists results.
 * @param aiSettings Reads token budgets and context size.
 * @param prompts Renders templates.
 * @param ollama LLM client.
 * @param eventService Loads conversation history.
 * @param signal Abort signal for pause control.
 * @param onStage Callback to update live progress label (D18).
 */
export interface RunSubReportArgs {
  sub: AiConversationSubReportRecord;
  conversation: Conversation;
  aiStorage: AiStorageRepository;
  aiSettings: AiSettingsService;
  prompts: PromptService;
  ollama: OllamaClient;
  eventService: EventService;
  signal: AbortSignal;
  onStage: (stage: string) => void;
}

/**
 * Runs the full sub-report pipeline for one conversation: load events → build transcript → apply budget → call LLM → parse → persist.
 * Throws OllamaToolCallMissingError / OllamaToolCallInvalidError on LLM failures (D26).
 * Caller handles errors by marking sub-report failed and checking 3-strike failure rule (D20).
 */
export const runSubReport = async (args: RunSubReportArgs): Promise<void> => {
  const {sub, conversation, aiStorage, aiSettings, prompts, ollama, eventService, signal, onStage} = args;
  const settings = await aiSettings.getAll();

  onStage('Loading events');
  const dbEvents = await eventService.loadPrecedingEvents(conversation.id, new Date(0), new Date(), 5000);
  const events = Array.isArray(dbEvents) ? dbEvents : await dbEvents.toArray();

  onStage('Building transcript');
  const lines = buildTranscriptLines(conversation, events);
  const lineStrings = lines.map(l => l.text);
  const rawTokens = countTokens(lineStrings.join('\n'));

  const participants = conversation.participating_user_ets().map(u => ({
    name: u.name?.() ?? '',
    handle: u.handle ?? '',
    qualified_id: u.qualifiedId,
  }));
  const conversationKind = conversation.is1to1?.() ? '1-to-1' : conversation.isChannel?.() ? 'channel' : 'group';
  const overheadVars = {
    user_job_description: settings.jobDescription,
    conversation_name: conversation.display_name(),
    conversation_kind: conversationKind,
    participants,
    ai_description: sub.ai_description_snapshot,
    transcript: TRANSCRIPT_PLACEHOLDER,
    example_tool_call_json: '{}',
    iso_now: new Date().toISOString(),
  };
  const rendered = await prompts.render('sub_report', overheadVars);
  const overheadTokens = countTokens(rendered.replace(TRANSCRIPT_PLACEHOLDER, ''));

  const reportRow = await aiStorage.getReport(sub.report_id);
  const contextSize = reportRow?.snapshot.context_size ?? settings.manualContextSize;
  const budget = computeBudget({
    contextSize,
    promptOverheadTokens: overheadTokens,
    safetyMarginPct: settings.safetyMarginPct,
  });

  onStage('Applying token budget');
  const trunc = truncateTranscript(lineStrings, budget.forTranscript, settings.perMessageTokenCap);
  const truncatedTranscript = trunc.lines.join('\n');
  const truncatedTokens = countTokens(truncatedTranscript);

  onStage('Calling LLM');
  const finalPrompt = await prompts.render('sub_report', {
    ...overheadVars,
    transcript: truncatedTranscript,
    example_tool_call_json: JSON.stringify(
      {
        entries: [
          {
            type: 'report',
            participants: [],
            description: '...',
            start: '2026-01-01T00:00:00.000Z',
            end: '2026-01-01T01:00:00.000Z',
          },
          {type: 'todo', title: '...', description: '...', created_at: '2026-01-01T00:00:00.000Z'},
          {type: 'ticket', title: '...', description: '...', created_at: '2026-01-01T00:00:00.000Z'},
        ],
      },
      null,
      2,
    ),
  });

  const response = await ollama.chat({
    messages: [{role: 'user', content: finalPrompt}],
    tools: [SUB_REPORT_TOOL],
    toolChoice: 'auto',
    numCtx: contextSize,
    signal,
  });

  onStage('Parsing tool call');
  const call = response.message.tool_calls?.[0];
  if (!call) {
    throw new OllamaToolCallMissingError();
  }
  const rawArgs =
    typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments;
  const parse = SubReportToolArgsSchema.safeParse(rawArgs);
  if (!parse.success) {
    throw new OllamaToolCallInvalidError(parse.error.issues);
  }

  await aiStorage.updateSubReport(sub.id, {
    status: 'done',
    entries: parse.data.entries,
    stats: {
      ...sub.stats,
      raw_token_estimate: rawTokens,
      truncated_token_estimate: truncatedTokens,
      message_count_before_truncation: lineStrings.length,
      message_count_after_truncation: trunc.lines.length,
      started_at: sub.stats.started_at,
      finished_at: new Date().toISOString(),
    },
  });
};
