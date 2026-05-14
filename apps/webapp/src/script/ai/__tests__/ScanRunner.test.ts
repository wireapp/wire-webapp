import 'fake-indexeddb/auto';

import {describe, it, expect, beforeEach, afterEach} from '@jest/globals';

import {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {ScanRunner, type ScanRunnerDeps} from '../pipeline/ScanRunner';
import {AiStorageRepository} from '../storage/AiStorageRepository';
import {AiSettingsService} from '../settings/AiSettingsService';
import type {OllamaClient} from '../ollama/OllamaClient';
import type {EventService} from 'Repositories/event/EventService';
import type {ConversationState} from 'Repositories/conversation/ConversationState';

const makeMockOllama = (): Partial<OllamaClient> => ({
  listModels: jest.fn().mockResolvedValue(['test-model']),
  getContextLength: jest.fn().mockResolvedValue(4096),
  chat: jest.fn().mockResolvedValue({
    message: {
      tool_calls: [
        {
          function: {
            name: 'report_completion',
            arguments: {entries: []},
          },
        },
      ],
    },
  }),
});

const makeMockEventService = (): Partial<EventService> => ({
  loadPrecedingEvents: jest.fn().mockResolvedValue([]),
});

const makeMockConversationState = (
  convs: Array<{id: string; name: string}>,
): Partial<ConversationState> => ({
  conversations: () =>
    convs.map(c => ({
      id: c.id,
      is_archived: () => false,
      display_name: () => c.name,
      domain: null,
      participating_user_ets: () => [],
      is1to1: () => false,
      isChannel: () => false,
    })) as unknown[],
});

describe('ScanRunner', () => {
  let db: DexieDatabase;
  let aiStorage: AiStorageRepository;
  let aiSettings: AiSettingsService;

  beforeEach(async () => {
    db = new DexieDatabase(`test-db-${Date.now()}-${Math.random()}`);
    await db.open();
    aiStorage = new AiStorageRepository(db);
    aiSettings = new AiSettingsService(db);

    // Set up AI settings using the actual service
    await aiSettings.setOllamaUrl('http://localhost:11434');
    await aiSettings.setOllamaModel('test-model');
    await aiSettings.setManualContextSize(4096);
    await aiSettings.setPerMessageTokenCap(500);
    await aiSettings.setSafetyMarginPct(0.1);
    await aiSettings.setJobDescription('engineer');
  });

  afterEach(async () => {
    await db.delete();
  });

  it('can be instantiated with mock dependencies', () => {
    const mockOllama = makeMockOllama();
    const mockEventService = makeMockEventService();
    const mockConversationState = makeMockConversationState([
      {id: 'conv-a', name: 'Conv A'},
      {id: 'conv-b', name: 'Conv B'},
    ]);

    const deps: ScanRunnerDeps = {
      aiStorage,
      aiSettings: {
        getAll: jest.fn().mockResolvedValue({
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'test-model',
          manualContextSize: 4096,
          safetyMarginPct: 0.1,
          perMessageTokenCap: 500,
          jobDescription: 'engineer',
        }),
        getOllamaModel: jest.fn().mockResolvedValue('test-model'),
        getOllamaUrl: jest.fn().mockResolvedValue('http://localhost:11434'),
      } as any,
      prompts: {
        render: jest.fn().mockResolvedValue('test prompt'),
      } as any,
      conversationState: mockConversationState as ConversationState,
      eventService: mockEventService as EventService,
      buildOllama: jest.fn().mockReturnValue(mockOllama),
    };

    const scanner = new ScanRunner(deps);
    expect(scanner).toBeDefined();
  });

  it('creates a report on start', async () => {
    const mockOllama = makeMockOllama();
    const deps: ScanRunnerDeps = {
      aiStorage,
      aiSettings: {
        getAll: jest.fn().mockResolvedValue({
          ollamaUrl: 'http://localhost:11434',
          ollamaModel: 'test-model',
          manualContextSize: 4096,
          safetyMarginPct: 0.1,
          perMessageTokenCap: 500,
          jobDescription: 'engineer',
        }),
        getOllamaModel: jest.fn().mockResolvedValue('test-model'),
        getOllamaUrl: jest.fn().mockResolvedValue('http://localhost:11434'),
      } as any,
      prompts: {
        render: jest.fn().mockResolvedValue('test prompt'),
      } as any,
      conversationState: makeMockConversationState([
        {id: 'conv-a', name: 'Conv A'},
      ]) as ConversationState,
      eventService: makeMockEventService() as EventService,
      buildOllama: jest.fn().mockReturnValue(mockOllama),
    };

    const scanner = new ScanRunner(deps);
    const reportId = await scanner.start();

    expect(reportId).toBeDefined();
    expect(typeof reportId).toBe('string');

    // Wait a brief moment for async operations to settle
    await new Promise(resolve => setTimeout(resolve, 50));

    const report = await aiStorage.getReport(reportId);
    expect(report).toBeDefined();
    expect(report?.id).toBe(reportId);
  });
});
