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

import type {SelfUserInfo} from '../transcript/buildTranscript';

import {ConsecutiveFailureTracker} from './ConsecutiveFailureTracker';
import {runFinalReport} from './runFinalReport';
import {runSubReport} from './runSubReport';
import {runSubReportIncremental} from './runSubReportIncremental';
import {selectConversationsToScan} from './selectConversationsToScan';

import {OllamaModelMissingError} from '../ollama/errors';
import type {OllamaClient} from '../ollama/OllamaClient';
import type {PromptService} from '../prompts/PromptService';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {AiStorageRepository} from '../storage/AiStorageRepository';
import {useReportsStore} from '../stores/useReportsStore';

const log = getLogger('AI/ScanRunner');

/** Dependencies injected into ScanRunner at construction time. */
export interface ScanRunnerDeps {
  aiStorage: AiStorageRepository;
  aiSettings: AiSettingsService;
  prompts: PromptService;
  conversationState: ConversationState;
  eventService: EventService;
  buildOllama: () => Promise<OllamaClient>;
  selfUser: SelfUserInfo;
}

/**
 * Module-level singleton orchestrating the AI scanning pipeline.
 * Drives the per-conversation loop and the final-merge pass.
 * Maintains a ConsecutiveFailureTracker that auto-pauses after 3 consecutive failures (D20).
 */
export class ScanRunner {
  private currentReportId: string | null = null;
  private abortController: AbortController | null = null;
  private readonly tracker = new ConsecutiveFailureTracker(3);

  constructor(private readonly deps: ScanRunnerDeps) {}

  /** True while a scan is actively running. */
  get isRunning(): boolean {
    return this.currentReportId !== null;
  }

  /** Starts a new scan. Throws OllamaModelMissingError if the configured model is not installed. */
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

      const previous = await this.deps.aiStorage.findLatestDoneSubReportForConversation(c.id);
      const scan_finished_ms = previous?.stats.finished_at
        ? new Date(previous.stats.finished_at).getTime()
        : 0;

      if (previous !== undefined && c.last_event_timestamp() <= scan_finished_ms) {
        // No new messages — reuse the previous sub-report wholesale (no LLM call needed).
        log.info(`Reusing sub-report ${previous.id} for conversation ${c.id} — no new messages since last scan`);
        await this.deps.aiStorage.createSubReport({
          id: crypto.randomUUID(),
          report_id: report.id,
          conversation_id: c.id,
          conversation_domain: c.domain ?? null,
          conversation_name_snapshot: c.display_name(),
          ai_description_snapshot: cSettings?.ai_description ?? '',
          status: 'done',
          error: null,
          entries: previous.entries,
          stats: previous.stats,
          reused_from_sub_report_id: previous.id,
          created_at: new Date().toISOString(),
        });
      } else if (previous !== undefined && previous.entries.length > 0) {
        // New messages exist AND we have prior entries — use incremental scan to update in place.
        log.info(`Incremental scan for conversation ${c.id} — previous sub-report ${previous.id} has entries`);
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
          // Carry forward previous entry_statuses so accept/hide decisions persist into the new scan.
          entry_statuses: previous.entry_statuses,
          created_at: new Date().toISOString(),
        });
      } else {
        // No prior entries (first scan or previous scan produced nothing) — fresh scan.
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
    }

    this.currentReportId = report.id;
    this.abortController = new AbortController();
    this.tracker.reset();

    void this.driveScan(report.id, ollama, targets).catch((err: unknown) => {
      log.error(`Scan driver crashed: ${(err as Error).message}`);
    });

    return report.id;
  }

  /** Resumes an interrupted scan from the next non-done sub-report. */
  async resume(reportId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('A scan is already running');
    }

    const report = await this.deps.aiStorage.getReport(reportId);
    if (!report) {
      throw new Error(`No report found: ${reportId}`);
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
      .filter((c): c is Conversation => Boolean(c));

    this.currentReportId = reportId;
    this.abortController = new AbortController();
    this.tracker.reset();

    // If final_pass_started_at is set, the sub-reports all completed — jump straight to final pass (D21 / Q&A R1 Q3).
    const jumpToFinalPass = report.final_pass_started_at !== null;

    void this.driveScan(reportId, ollama, targets, {jumpToFinalPass}).catch(
      (err: unknown) => {
        log.error(`Resume driver crashed: ${(err as Error).message}`);
      },
    );
  }

  /**
   * Re-runs only the final-merge LLM pass for an existing report, replacing its final entries.
   * Useful when the prompt has changed or the previous final pass produced wrong results.
   * Blocked while any scan is already running.
   */
  async rerunFinalPass(reportId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Cannot re-run final pass while a scan is running');
    }

    const report = await this.deps.aiStorage.getReport(reportId);
    if (!report) {
      throw new Error(`No report found: ${reportId}`);
    }

    const ollama = await this.deps.buildOllama();

    this.currentReportId = reportId;
    this.abortController = new AbortController();

    await this.deps.aiStorage.updateReport(reportId, {
      status: 'scanning',
      error: null,
      final_pass_started_at: new Date().toISOString(),
      final_pass_finished_at: null,
    });
    await this.deps.aiStorage.deleteFinalEntries(reportId);

    try {
      await runFinalReport({
        reportId,
        aiStorage: this.deps.aiStorage,
        aiSettings: this.deps.aiSettings,
        prompts: this.deps.prompts,
        ollama,
        signal: this.abortController.signal,
      });
      await this.deps.aiStorage.updateReport(reportId, {
        status: 'finished',
        finished_at: new Date().toISOString(),
        final_pass_finished_at: new Date().toISOString(),
      });
      log.info(`Final pass re-run succeeded for report ${reportId}`);
    } catch (err) {
      log.error(`Final pass re-run failed for report ${reportId}: ${(err as Error).message}`);
      await this.deps.aiStorage.updateReport(reportId, {
        status: 'interrupted',
        error: `Final pass failed: ${(err as Error).message}`,
      });
    } finally {
      this.currentReportId = null;
      this.abortController = null;
    }
  }

  /**
   * Retries a single failed sub-report without starting a full scan.
   * Blocked while a full scan is running to avoid concurrent Ollama calls.
   */
  async retrySingleSubReport(subReportId: string): Promise<void> {
    if (this.isRunning) {
      throw new Error('Cannot retry while a full scan is running');
    }

    const sub = await this.deps.aiStorage.getSubReport(subReportId);
    if (!sub) {
      throw new Error(`Sub-report not found: ${subReportId}`);
    }

    const conversation = this.deps.conversationState.conversations().find(c => c.id === sub.conversation_id);
    if (!conversation) {
      throw new Error(`Conversation not found in state: ${sub.conversation_id}`);
    }

    const ollama = await this.deps.buildOllama();
    const liveStore = useReportsStore;

    await this.deps.aiStorage.updateSubReport(subReportId, {
      status: 'running',
      error: null,
      stats: {...sub.stats, started_at: new Date().toISOString()},
    });

    liveStore.setState(s => ({liveStage: {...s.liveStage, [conversation.id]: 'Loading events'}}));

    const abortController = new AbortController();

    try {
      await runSubReport({
        sub,
        conversation,
        selfUser: this.deps.selfUser,
        aiStorage: this.deps.aiStorage,
        aiSettings: this.deps.aiSettings,
        prompts: this.deps.prompts,
        ollama,
        eventService: this.deps.eventService,
        signal: abortController.signal,
        onStage: stage => liveStore.setState(s => ({liveStage: {...s.liveStage, [conversation.id]: stage}})),
      });
      log.info(`Retry succeeded for sub-report ${subReportId}`);
    } catch (err) {
      log.error(`Retry failed for sub-report ${subReportId}: ${(err as Error).message}`);
      const current = await this.deps.aiStorage.getSubReport(subReportId);
      await this.deps.aiStorage.updateSubReport(subReportId, {
        status: 'failed',
        error: (err as Error).message,
        stats: {...(current?.stats ?? sub.stats), finished_at: new Date().toISOString()},
      });
    } finally {
      liveStore.setState(s => {
        const next = {...s.liveStage};
        delete next[conversation.id];
        return {liveStage: next};
      });
    }
  }

  /** Pauses the running scan and marks it interrupted. */
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
    targets: Conversation[],
    options: {jumpToFinalPass?: boolean} = {},
  ): Promise<void> {
    const liveStore = useReportsStore;

    if (!options.jumpToFinalPass) {
      for (const c of targets) {
        if (this.abortController?.signal.aborted) {
          return;
        }

        const sub = await this.deps.aiStorage.getSubReportForConversation(reportId, c.id);
        if (!sub) {
          continue;
        }
        if (sub.status === 'done') {
          continue;
        }

        liveStore.setState(s => ({liveStage: {...s.liveStage, [c.id]: 'Loading events'}}));

        await this.deps.aiStorage.updateSubReport(sub.id, {
          status: 'running',
          error: null,
          stats: {...sub.stats, started_at: new Date().toISOString()},
        });

        try {
          // Determine whether to run incrementally: if a previous scan produced entries
          // for this conversation and this sub-report is a fresh pending one (not a reuse).
          const previous_for_incremental =
            !sub.reused_from_sub_report_id
              ? await this.deps.aiStorage.findLatestDoneSubReportForConversation(c.id)
              : undefined;

          const use_incremental =
            previous_for_incremental !== undefined &&
            previous_for_incremental.id !== sub.id &&
            previous_for_incremental.entries.length > 0;

          if (use_incremental && previous_for_incremental) {
            await runSubReportIncremental({
              sub,
              previousEntries: previous_for_incremental.entries,
              conversation: c,
              selfUser: this.deps.selfUser,
              aiStorage: this.deps.aiStorage,
              aiSettings: this.deps.aiSettings,
              prompts: this.deps.prompts,
              ollama,
              eventService: this.deps.eventService,
              signal: this.abortController!.signal,
              onStage: stage => liveStore.setState(s => ({liveStage: {...s.liveStage, [c.id]: stage}})),
            });
          } else {
            await runSubReport({
              sub,
              conversation: c,
              selfUser: this.deps.selfUser,
              aiStorage: this.deps.aiStorage,
              aiSettings: this.deps.aiSettings,
              prompts: this.deps.prompts,
              ollama,
              eventService: this.deps.eventService,
              signal: this.abortController!.signal,
              onStage: stage => liveStore.setState(s => ({liveStage: {...s.liveStage, [c.id]: stage}})),
            });
          }
          this.tracker.recordSuccess();
          log.info(`Sub-report done for conversation ${c.id}`);
        } catch (err) {
          log.error(`Sub-report failed for conversation ${c.id}: ${(err as Error).message}`);
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

    if (this.abortController?.signal.aborted) {
      return;
    }

    try {
      log.info(`Starting final pass for report ${reportId}`);
      await this.deps.aiStorage.updateReport(reportId, {final_pass_started_at: new Date().toISOString()});

      // On resume, delete any prior final entries before re-running (D25 / Q&A R1 Q5).
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
      log.info(`Scan ${reportId} finished`);
    } catch (err) {
      // Final-pass failure leaves the report interrupted with final_pass_started_at set (D21).
      log.error(`Final pass failed for report ${reportId}: ${(err as Error).message}`);
      await this.deps.aiStorage.updateReport(reportId, {
        status: 'interrupted',
        error: `Final pass failed: ${(err as Error).message}`,
      });
    } finally {
      this.currentReportId = null;
      this.abortController = null;
    }
  }
}
