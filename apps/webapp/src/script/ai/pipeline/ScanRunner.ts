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

import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {EventService} from 'Repositories/event/EventService';
import {getLogger} from 'Util/logger';

import {ConsecutiveFailureTracker} from './ConsecutiveFailureTracker';
import {runFinalReport} from './runFinalReport';
import {runSubReport} from './runSubReport';
import {selectConversationsToScan} from './selectConversationsToScan';

import {OllamaModelMissingError} from '../ollama/errors';
import type {OllamaClient} from '../ollama/OllamaClient';
import type {PromptService} from '../prompts/PromptService';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {AiStorageRepository} from '../storage/AiStorageRepository';
import {useReportsStore} from '../stores/useReportsStore';

const log = getLogger('AI/ScanRunner');

/**
 * Dependencies for ScanRunner.
 * @param aiStorage Persists reports and sub-reports.
 * @param aiSettings Reads model, context size, token budgets.
 * @param prompts Renders templates for sub-report and final-report passes.
 * @param conversationState Provides conversation list.
 * @param eventService Loads conversation event history.
 * @param buildOllama Factory to build OllamaClient from current settings (allows URL refresh at scan time).
 */
export interface ScanRunnerDeps {
  aiStorage: AiStorageRepository;
  aiSettings: AiSettingsService;
  prompts: PromptService;
  conversationState: ConversationState;
  eventService: EventService;
  buildOllama: () => Promise<OllamaClient>;
}

/**
 * Stateful orchestrator for the full scan lifecycle: preflight → conversation selection → per-conversation sub-report passes → final merge pass.
 * Singleton held in bootstrap context; runs on main thread (D17).
 * Tracks consecutive failures (D20) and handles interruption/resume with final-pass statepreservation (D21).
 */
export class ScanRunner {
  private currentReportId: string | null = null;
  private abortController: AbortController | null = null;
  private readonly tracker = new ConsecutiveFailureTracker(3);

  constructor(private readonly deps: ScanRunnerDeps) {}

  /** True if a scan is currently running. */
  get isRunning(): boolean {
    return this.currentReportId !== null;
  }

  /**
   * Starts a new scan. Throws if one is already running.
   * Preflight checks model availability, selects target conversations, creates report with pending sub-reports, then launches driveScan asynchronously.
   * Returns the report ID immediately; progress tracked via Dexie and Zustand.
   * Throws OllamaModelMissingError if configured model is not installed.
   */
  async start(): Promise<string> {
    if (this.isRunning) {
      throw new Error('A scan is already running');
    }
    const ollama = await this.deps.buildOllama();

    const models = await ollama.listModels();
    const model = await this.deps.aiSettings.getOllamaModel();
    if (!models.includes(model)) {
      throw new OllamaModelMissingError(model);
    }

    const targets = await selectConversationsToScan(this.deps.conversationState, this.deps.aiStorage);
    const settings = await this.deps.aiSettings.getAll();
    const detectedContext = (await ollama.getContextLength()) ?? settings.manualContextSize;

    const report = await this.deps.aiStorage.createReport({
      finished_at: null,
      status: 'scanning',
      target_conversation_ids: targets.map(t => t.id),
      final_pass_started_at: null,
      final_pass_finished_at: null,
      snapshot: {
        model,
        context_size: detectedContext,
        safety_margin_pct: settings.safetyMarginPct,
        per_message_token_cap: settings.perMessageTokenCap,
        job_description: settings.jobDescription,
      },
      error: null,
    });

    for (const c of targets) {
      const cSettings = await this.deps.aiStorage.getConversationSettings(c.id);
      await this.deps.aiStorage.createSubReport({
        id: crypto.randomUUID(),
        report_id: report.id,
        conversation_id: c.id,
        conversation_domain: c.domain ?? null,
        conversation_name_snapshot: c.display_name(),
        ai_description_snapshot: cSettings?.ai_description ?? '',
        status: 'pending',
        error: null,
        entries: [],
        stats: {
          raw_token_estimate: 0,
          truncated_token_estimate: 0,
          message_count_before_truncation: 0,
          message_count_after_truncation: 0,
          started_at: null,
          finished_at: null,
        },
        created_at: new Date().toISOString(),
      });
    }

    this.currentReportId = report.id;
    this.abortController = new AbortController();
    this.tracker.reset();
    void this.driveScan(report.id, ollama, targets).catch((err: unknown) => {
      log.error(`Scan driver crashed: ${(err as Error).message}`);
    });
    return report.id;
  }

  /**
   * Resumes an interrupted report. Throws if not running and no report or wrong status.
   * Reconstructs targets from persisted target list, detects if final-pass was started (D21),
   * and launches driveScan with appropriate skip flags.
   */
  async resume(reportId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('A scan is already running');
    }
    const report = await this.deps.aiStorage.getReport(reportId);
    if (!report) {
      throw new Error(`No report ${reportId}`);
    }
    if (report.status !== 'interrupted') {
      throw new Error(`Report ${reportId} is not interrupted (status=${report.status})`);
    }

    const ollama = await this.deps.buildOllama();
    const models = await ollama.listModels();
    if (!models.includes(report.snapshot.model)) {
      throw new OllamaModelMissingError(report.snapshot.model);
    }

    await this.deps.aiStorage.updateReport(reportId, {status: 'scanning', error: null});

    const allConvs = this.deps.conversationState.conversations();
    const targets = report.target_conversation_ids
      .map(id => allConvs.find(c => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    this.currentReportId = reportId;
    this.abortController = new AbortController();
    this.tracker.reset();
    void this.driveScan(reportId, ollama, targets, {
      resume: true,
      skipDoneSubReports: true,
      jumpToFinalPass: report.final_pass_started_at !== null,
    }).catch((err: unknown) => {
      log.error(`Resume driver crashed: ${(err as Error).message}`);
    });
  }

  /**
   * Pauses the currently running scan. Synchronous; does not await the Dexie write.
   */
  pause(): void {
    this.abortController?.abort();
    if (this.currentReportId) {
      void this.deps.aiStorage.updateReport(this.currentReportId, {status: 'interrupted'});
    }
    this.currentReportId = null;
    this.abortController = null;
  }

  private async driveScan(
    reportId: string,
    ollama: OllamaClient,
    targets: ReadonlyArray<{id: string; display_name: () => string; participating_user_ets: () => unknown[]}>,
    options: {resume?: boolean; skipDoneSubReports?: boolean; jumpToFinalPass?: boolean} = {},
  ): Promise<void> {
    const liveStore = useReportsStore;

    try {
      if (!options.jumpToFinalPass) {
        for (const c of targets) {
          if (this.abortController?.signal.aborted) {
            return;
          }
          const sub = await this.deps.aiStorage.getSubReportForConversation(reportId, c.id);
          if (!sub) {
            continue;
          }
          if (options.skipDoneSubReports && sub.status === 'done') {
            continue;
          }

          liveStore.setState(s => ({liveStage: {...s.liveStage, [c.id]: 'Loading events'}}));
          await this.deps.aiStorage.updateSubReport(sub.id, {
            status: 'running',
            error: null,
            stats: {...sub.stats, started_at: new Date().toISOString()},
          });

          try {
            await runSubReport({
              sub,
              conversation: c as unknown as Conversation,
              aiStorage: this.deps.aiStorage,
              aiSettings: this.deps.aiSettings,
              prompts: this.deps.prompts,
              ollama,
              eventService: this.deps.eventService,
              signal: this.abortController!.signal,
              onStage: stage => liveStore.setState(s => ({liveStage: {...s.liveStage, [c.id]: stage}})),
            });
            this.tracker.recordSuccess();
          } catch (err) {
            await this.deps.aiStorage.updateSubReport(sub.id, {
              status: 'failed',
              error: (err as Error).message,
              stats: {...sub.stats, finished_at: new Date().toISOString()},
            });
            if (this.tracker.recordFailure()) {
              log.error('Three consecutive failures — pausing scan');
              await this.deps.aiStorage.updateReport(reportId, {
                status: 'interrupted',
                error: 'Three consecutive sub-report failures',
              });
              this.currentReportId = null;
              liveStore.setState({liveStage: {}});
              return;
            }
          } finally {
            liveStore.setState(s => {
              const next = {...s.liveStage};
              delete next[c.id];
              return {liveStage: next};
            });
          }
        }
      }

      const reportRow = await this.deps.aiStorage.getReport(reportId);
      if (!reportRow) {
        return;
      }
      if (this.abortController?.signal.aborted) {
        return;
      }

      try {
        await this.deps.aiStorage.updateReport(reportId, {final_pass_started_at: new Date().toISOString()});
        await this.deps.aiStorage.deleteFinalEntries(reportId);
        await runFinalReport({
          reportId,
          aiStorage: this.deps.aiStorage,
          aiSettings: this.deps.aiSettings,
          prompts: this.deps.prompts,
          ollama,
          signal: this.abortController!.signal,
        });
        await this.deps.aiStorage.updateReport(reportId, {
          status: 'finished',
          finished_at: new Date().toISOString(),
          final_pass_finished_at: new Date().toISOString(),
        });
      } catch (err) {
        await this.deps.aiStorage.updateReport(reportId, {
          status: 'interrupted',
          error: `Final pass failed: ${(err as Error).message}`,
        });
      }
    } finally {
      this.currentReportId = null;
      this.abortController = null;
    }
  }
}
