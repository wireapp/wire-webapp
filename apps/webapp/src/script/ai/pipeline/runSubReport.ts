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

import {SubReportToolArgsSchema} from '../domain/EntryTypes';
import {OllamaToolCallInvalidError, OllamaToolCallMissingError} from '../ollama/errors';
import {SUB_REPORT_TOOL} from '../ollama/OllamaClient';
import type {OllamaClient} from '../ollama/OllamaClient';
import type {PromptService} from '../prompts/PromptService';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {AiStorageRepository} from '../storage/AiStorageRepository';
import type {AiConversationSubReportRecord} from '../storage/records';
import {computeBudget} from '../tokenizer/budget';
import {countTokens} from '../tokenizer/tokenize';
import {truncateTranscript} from '../tokenizer/truncate';
import {buildTranscriptLines, transcriptLinesToString, type SelfUserInfo} from '../transcript/buildTranscript';

/** Placeholder injected into the prompt to measure overhead without the real transcript. */
const TRANSCRIPT_PLACEHOLDER = '__TRANSCRIPT_PLACEHOLDER__';

/** Arguments for a single sub-report run. */
export interface RunSubReportArgs {
  sub: AiConversationSubReportRecord;
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
 * Processes a single conversation sub-report:
 * loads events, builds + truncates transcript, renders prompt, calls Ollama, validates and persists.
 */
export const runSubReport = async (args: RunSubReportArgs): Promise<void> => {
  const {sub, conversation, selfUser, aiStorage, aiSettings, prompts, ollama, eventService, signal, onStage} = args;
  const settings = await aiSettings.getAll();

  onStage('Loading events');
  // loadPrecedingEvents always resolves to EventRecord[] at runtime; the return type is a union due to internal branching.
  const events = (await eventService.loadPrecedingEvents(
    conversation.id,
    new Date(0),
    new Date(),
    5000,
  )) as EventRecord[];

  onStage('Building transcript');
  const lines = buildTranscriptLines(conversation, events, selfUser);
  const lineStrings = lines.map(l => l.text);
  const rawTokens = countTokens(lineStrings.join('\n'));

  // Build the overhead vars with a placeholder instead of the real transcript to measure prompt size.
  const users = conversation.participating_user_ets();
  const participants = users.map(u => ({
    name: (u.name as (() => string) | undefined)?.() ?? '',
    handle: (u as {handle?: string}).handle ?? '',
    qualified_id: u.qualifiedId,
  }));
  const conversationKind = conversation.is1to1?.() ? '1-to-1' : conversation.isChannel?.() ? 'channel' : 'group';

  const overheadVars = {
    self_user_name: selfUser.name,
    self_user_handle: selfUser.handle,
    user_job_description: settings.jobDescription,
    conversation_name: conversation.display_name(),
    conversation_kind: conversationKind,
    participants,
    ai_description: sub.ai_description_snapshot,
    transcript: TRANSCRIPT_PLACEHOLDER,
    example_tool_call_json: '{}',
    iso_now: new Date().toISOString(),
  };

  const renderedOverhead = await prompts.render('sub_report', overheadVars);
  const overheadTokens = countTokens(renderedOverhead.replace(TRANSCRIPT_PLACEHOLDER, ''));

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
            source_timestamp: '2026-01-01T00:00:00.000Z',
          },
          {
            type: 'todo',
            title: '...',
            description: '...',
            created_at: '2026-01-01T00:00:00.000Z',
            source_timestamp: '2026-01-01T00:00:00.000Z',
          },
          {
            type: 'ticket',
            title: '...',
            description: '...',
            created_at: '2026-01-01T00:00:00.000Z',
            source_timestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      null,
      2,
    ),
  });

  // Suppress unused variable warning — transcriptLinesToString is part of the public API exported from this module's sibling.
  void transcriptLinesToString;

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
    typeof call.function.arguments === 'string'
      ? JSON.parse(call.function.arguments as string)
      : call.function.arguments;

  const parse = SubReportToolArgsSchema.safeParse(rawArgs);
  if (!parse.success) {
    throw new OllamaToolCallInvalidError(parse.error.issues);
  }

  await aiStorage.updateSubReport(sub.id, {
    status: 'done',
    entries: parse.data.entries.map(entry => ({...entry, id: crypto.randomUUID()})),
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
