import {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {runSubReport} from '../script/ai/pipeline/runSubReport';
import {AiStorageRepository} from '../script/ai/storage/AiStorageRepository';
import {OllamaToolCallMissingError, OllamaToolCallInvalidError} from '../script/ai/ollama/errors';

jest.mock('Util/logger', () => ({
  getLogger: () => ({info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()}),
}));

const VALID_TOOL_CALL = {
  function: {
    name: 'report_completion',
    arguments: {
      entries: [
        {
          type: 'todo',
          title: 'Follow up with Bob',
          description: 'Send the report by Friday',
          created_at: '2026-01-01T10:00:00.000Z',
        },
      ],
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeOllamaMock = (toolCall: any = VALID_TOOL_CALL) => ({
  chat: jest.fn().mockResolvedValue({
    message: {content: '', tool_calls: [toolCall]},
    done: true,
  }),
  listModels: jest.fn(),
  getContextLength: jest.fn(),
});

const makeSettingsMock = () => ({
  getAll: jest.fn().mockResolvedValue({
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'test-model',
    manualContextSize: 32768,
    perMessageTokenCap: 800,
    safetyMarginPct: 0.2,
    jobDescription: 'engineer',
  }),
  getOllamaModel: jest.fn(),
  getOllamaUrl: jest.fn(),
  getManualContextSize: jest.fn(),
  getPerMessageTokenCap: jest.fn(),
  getSafetyMarginPct: jest.fn(),
  getJobDescription: jest.fn(),
});

const makePromptsMock = () => ({
  render: jest.fn().mockResolvedValue('compiled prompt text'),
});

const makeEventServiceMock = () => ({
  loadPrecedingEvents: jest.fn().mockResolvedValue([]),
});

const makeConversation = (id = 'conv-1') => ({
  id,
  domain: null,
  display_name: () => `Conv ${id}`,
  is_archived: () => false,
  is1to1: () => false,
  isChannel: () => false,
  hasService: false,
  participating_user_ets: () => [],
  qualifiedId: {id, domain: ''},
});

describe('runSubReport', () => {
  let db: DexieDatabase;
  let repo: AiStorageRepository;
  let reportId: string;
  let subId: string;

  beforeEach(async () => {
    db = new DexieDatabase(`test-run-sub-${Date.now()}-${Math.random()}`);
    await db.open();
    repo = new AiStorageRepository(db);

    // Create parent report
    const report = await repo.createReport({
      finished_at: null,
      status: 'scanning',
      target_conversation_ids: ['conv-1'],
      final_pass_started_at: null,
      final_pass_finished_at: null,
      snapshot: {
        model: 'test-model',
        context_size: 32768,
        safety_margin_pct: 0.2,
        per_message_token_cap: 800,
        job_description: 'engineer',
      },
      error: null,
    });
    reportId = report.id;

    // Create sub-report record
    subId = crypto.randomUUID();
    await repo.createSubReport({
      id: subId,
      report_id: reportId,
      conversation_id: 'conv-1',
      conversation_domain: null,
      conversation_name_snapshot: 'Conv conv-1',
      ai_description_snapshot: '',
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
  });

  afterEach(async () => {
    await db.delete();
  });

  const runWith = async (overrides: {ollama?: any; prompts?: any; eventService?: any; settings?: any} = {}) => {
    const sub = await repo.getSubReport(subId);
    return runSubReport({
      sub: sub!,
      conversation: makeConversation() as any,
      aiStorage: repo,
      aiSettings: overrides.settings ?? makeSettingsMock() as any,
      prompts: overrides.prompts ?? makePromptsMock() as any,
      ollama: overrides.ollama ?? makeOllamaMock() as any,
      eventService: overrides.eventService ?? makeEventServiceMock() as any,
      signal: new AbortController().signal,
      onStage: jest.fn(),
    });
  };

  it('happy path: marks the sub-report as done and saves parsed entries', async () => {
    await runWith();

    const updated = await repo.getSubReport(subId);
    expect(updated?.status).toBe('done');
    expect(updated?.entries).toHaveLength(1);
    expect(updated?.entries[0].type).toBe('todo');
  });

  it('saves stats with non-zero finished_at after a successful run', async () => {
    await runWith();

    const updated = await repo.getSubReport(subId);
    expect(updated?.stats.finished_at).toBeTruthy();
  });

  it('calls prompts.render twice — once for overhead estimation and once for the real prompt', async () => {
    const prompts = makePromptsMock();
    await runWith({prompts});
    expect(prompts.render).toHaveBeenCalledTimes(2);
  });

  it('calls onStage with progress labels during execution', async () => {
    const onStage = jest.fn();
    const sub = await repo.getSubReport(subId);
    await runSubReport({
      sub: sub!,
      conversation: makeConversation() as any,
      aiStorage: repo,
      aiSettings: makeSettingsMock() as any,
      prompts: makePromptsMock() as any,
      ollama: makeOllamaMock() as any,
      eventService: makeEventServiceMock() as any,
      signal: new AbortController().signal,
      onStage,
    });
    expect(onStage).toHaveBeenCalled();
    const stages = onStage.mock.calls.map((c: string[]) => c[0]);
    expect(stages).toContain('Loading events');
    expect(stages).toContain('Calling LLM');
  });

  it('throws OllamaToolCallMissingError when Ollama returns no tool calls', async () => {
    const ollama = makeOllamaMock();
    ollama.chat.mockResolvedValue({message: {content: 'sorry I cannot do that', tool_calls: []}, done: true});

    await expect(runWith({ollama})).rejects.toBeInstanceOf(OllamaToolCallMissingError);
  });

  it('throws OllamaToolCallInvalidError when the tool call fails schema validation', async () => {
    const badArgs = {entries: [{type: 'INVALID_TYPE', title: 'x'}]};
    const ollama = makeOllamaMock({function: {name: 'report_completion', arguments: badArgs}});

    await expect(runWith({ollama})).rejects.toBeInstanceOf(OllamaToolCallInvalidError);
  });

  it('handles tool call arguments delivered as a JSON string (not object)', async () => {
    const stringArgCall = {
      function: {
        name: 'report_completion',
        arguments: JSON.stringify(VALID_TOOL_CALL.function.arguments),
      },
    };
    await runWith({ollama: makeOllamaMock(stringArgCall)});

    const updated = await repo.getSubReport(subId);
    expect(updated?.status).toBe('done');
  });
});
