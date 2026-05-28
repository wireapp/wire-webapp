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

// Mock the Zustand store so driveScan's liveStore.setState calls don't crash in jsdom
jest.mock('../stores/useReportsStore', () => ({
  useReportsStore: {setState: jest.fn()},
}));

// Mock the pipeline helpers so driveScan never actually calls Ollama
jest.mock('../pipeline/selectConversationsToScan', () => ({
  selectConversationsToScan: jest.fn().mockResolvedValue([]),
}));
jest.mock('../pipeline/runSubReport', () => ({runSubReport: jest.fn()}));
jest.mock('../pipeline/runFinalReport', () => ({runFinalReport: jest.fn()}));

import {ScanRunner, type ScanRunnerDeps} from '../pipeline/ScanRunner';
import type {AiStorageRepository} from '../storage/AiStorageRepository';
import type {AiSettingsService} from '../settings/AiSettingsService';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import type {EventService} from 'Repositories/event/EventService';
import type {OllamaClient} from '../ollama/OllamaClient';
import type {AiReportRecord} from '../storage/records/AiReportRecord';

// Builds a minimal mock report record for a given status
const makeMockReport = (overrides: Partial<AiReportRecord> = {}): AiReportRecord => ({
  id: 'report-001',
  created_at: '2025-05-01T10:00:00Z',
  finished_at: null,
  status: 'scanning',
  target_conversation_ids: [],
  final_pass_started_at: null,
  final_pass_finished_at: null,
  snapshot: {
    model: 'qwen3:14b',
    context_size: 8192,
    safety_margin_pct: 0.2,
    per_message_token_cap: 500,
    job_description: 'Test job',
  },
  error: null,
  ...overrides,
});

// Builds a ScanRunnerDeps mock with sensible defaults
const makeDeps = (overrides: Partial<ScanRunnerDeps> = {}): ScanRunnerDeps => {
  const mockOllama = {
    listModels: jest.fn().mockResolvedValue(['qwen3:14b']),
    getContextLength: jest.fn().mockResolvedValue(8192),
    chat: jest.fn(),
  } as unknown as OllamaClient;

  const mockAiStorage = {
    createReport: jest.fn().mockResolvedValue(makeMockReport()),
    getReport: jest.fn().mockResolvedValue(undefined),
    updateReport: jest.fn().mockResolvedValue(undefined),
    deleteReport: jest.fn().mockResolvedValue(undefined),
    createSubReport: jest.fn().mockResolvedValue(undefined),
    getSubReportForConversation: jest.fn().mockResolvedValue(undefined),
    getConversationSettings: jest.fn().mockResolvedValue(undefined),
    findLatestDoneSubReportForConversation: jest.fn().mockResolvedValue(undefined),
    listSubReports: jest.fn().mockResolvedValue([]),
    deleteFinalEntries: jest.fn().mockResolvedValue(undefined),
    markRunningReportsInterrupted: jest.fn().mockResolvedValue([]),
  } as unknown as AiStorageRepository;

  const mockAiSettings = {
    getOllamaModel: jest.fn().mockResolvedValue('qwen3:14b'),
    getAll: jest.fn().mockResolvedValue({
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'qwen3:14b',
      manualContextSize: 8192,
      perMessageTokenCap: 500,
      safetyMarginPct: 0.2,
      jobDescription: 'Test job',
    }),
  } as unknown as AiSettingsService;

  const mockConversationState = {
    conversations: jest.fn().mockReturnValue([]),
  } as unknown as ConversationState;

  const mockEventService = {} as unknown as EventService;

  return {
    aiStorage: mockAiStorage,
    aiSettings: mockAiSettings,
    prompts: {} as never,
    conversationState: mockConversationState,
    eventService: mockEventService,
    buildOllama: jest.fn().mockResolvedValue(mockOllama),
    selfUser: {id: 'self-user-id', name: 'Test User', handle: 'testuser'},
    ...overrides,
  };
};

describe('ScanRunner', () => {
  describe('start()', () => {
    it('throws if a scan is already running', async () => {
      // Stall buildOllama so start() stays in-flight long enough for the second call
      let resolveBuildOllama!: () => void;
      const stallPromise = new Promise<void>(res => {
        resolveBuildOllama = res;
      });

      const mockOllamaAfterStall = {
        listModels: jest.fn().mockResolvedValue(['qwen3:14b']),
        getContextLength: jest.fn().mockResolvedValue(8192),
        chat: jest.fn(),
      };

      const deps = makeDeps({
        buildOllama: jest.fn().mockImplementation(async () => {
          await stallPromise;
          return mockOllamaAfterStall;
        }),
      });
      const runner = new ScanRunner(deps);

      // Kick off first scan — it will stay suspended inside buildOllama
      const firstStartPromise = runner.start();

      // At this point isRunning is not yet true because buildOllama hasn't returned.
      // Yield to the microtask queue so the async start() body reaches its first await.
      await Promise.resolve();

      // Now start() is suspended at `await this.deps.buildOllama()` — isRunning still false,
      // but the second call will race identically and also see isRunning = false yet.
      // Instead, test the guard after buildOllama resolves and the report is created.
      // Unblock the first scan so it sets currentReportId.
      resolveBuildOllama();
      await firstStartPromise;

      // Now currentReportId is set — isRunning is true while driveScan runs in the background
      expect(runner.isRunning).toBe(true);

      // A second start must now throw
      await expect(runner.start()).rejects.toThrow('A scan is already running');
    });
  });

  describe('pause()', () => {
    it('sets currentReportId to null and calls updateReport with status interrupted', async () => {
      const deps = makeDeps();
      const runner = new ScanRunner(deps);

      // Start the scan to get into running state
      await runner.start();
      expect(runner.isRunning).toBe(true);

      runner.pause();

      expect(runner.isRunning).toBe(false);
      expect(deps.aiStorage.updateReport).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({status: 'interrupted'}),
      );
    });

    it('is a no-op when not currently running', () => {
      const deps = makeDeps();
      const runner = new ScanRunner(deps);

      // Should not throw even when nothing is running
      expect(() => runner.pause()).not.toThrow();
      expect(deps.aiStorage.updateReport).not.toHaveBeenCalled();
    });
  });

  describe('resume()', () => {
    it('throws if a scan is already running', async () => {
      const deps = makeDeps();
      const runner = new ScanRunner(deps);

      await runner.start();
      expect(runner.isRunning).toBe(true);

      await expect(runner.resume('report-001')).rejects.toThrow('A scan is already running');
    });

    it('throws if the report is not found', async () => {
      const deps = makeDeps();
      // getReport returns undefined for this id
      (deps.aiStorage.getReport as jest.Mock).mockResolvedValue(undefined);

      const runner = new ScanRunner(deps);

      await expect(runner.resume('no-such-report')).rejects.toThrow('No report found: no-such-report');
    });

    it('throws if the report status is not interrupted', async () => {
      const deps = makeDeps();
      // Return a finished report — not resumable
      (deps.aiStorage.getReport as jest.Mock).mockResolvedValue(
        makeMockReport({id: 'report-001', status: 'finished'}),
      );

      const runner = new ScanRunner(deps);

      await expect(runner.resume('report-001')).rejects.toThrow(/not interrupted/);
    });

    it('succeeds and starts driving the scan when the report is interrupted', async () => {
      const deps = makeDeps();
      const interruptedReport = makeMockReport({status: 'interrupted'});
      (deps.aiStorage.getReport as jest.Mock).mockResolvedValue(interruptedReport);
      // conversationState.conversations returns [] so no sub-reports to iterate
      (deps.conversationState.conversations as unknown as jest.Mock).mockReturnValue([]);

      const runner = new ScanRunner(deps);

      // Should not throw
      await expect(runner.resume('report-001')).resolves.toBeUndefined();

      // updateReport must have been called to flip the status back to scanning
      expect(deps.aiStorage.updateReport).toHaveBeenCalledWith(
        'report-001',
        expect.objectContaining({status: 'scanning'}),
      );
    });
  });
});
