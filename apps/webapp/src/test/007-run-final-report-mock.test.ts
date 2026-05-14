import {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {runFinalReport} from '../script/ai/pipeline/runFinalReport';
import {AiStorageRepository} from '../script/ai/storage/AiStorageRepository';
import {OllamaToolCallMissingError, OllamaToolCallInvalidError} from '../script/ai/ollama/errors';

const VALID_FINAL_CALL = {
  function: {
    name: 'report_completion',
    arguments: {
      entries: [
        {
          type: 'todo',
          title: 'Review PR',
          description: 'Check the PR before merging',
          created_at: '2026-01-01T10:00:00.000Z',
          conversation_ids: ['conv-1'],
        },
      ],
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const makeOllamaMock = (toolCall: any = VALID_FINAL_CALL) => ({
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
});

const makePromptsMock = () => ({
  render: jest.fn().mockResolvedValue('final report prompt text'),
});

describe('runFinalReport', () => {
  let db: DexieDatabase;
  let repo: AiStorageRepository;
  let reportId: string;

  beforeEach(async () => {
    db = new DexieDatabase(`test-run-final-${Date.now()}-${Math.random()}`);
    await db.open();
    repo = new AiStorageRepository(db);

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
  });

  afterEach(async () => {
    await db.delete();
  });

  const seedDoneSub = async () => {
    const subId = crypto.randomUUID();
    await repo.createSubReport({
      id: subId,
      report_id: reportId,
      conversation_id: 'conv-1',
      conversation_domain: null,
      conversation_name_snapshot: 'Conv 1',
      ai_description_snapshot: 'engineering channel',
      status: 'done',
      error: null,
      entries: [
        {type: 'todo', title: 'Write tests', description: 'Add coverage', created_at: '2026-01-01T09:00:00.000Z'},
      ],
      stats: {
        raw_token_estimate: 100,
        truncated_token_estimate: 100,
        message_count_before_truncation: 5,
        message_count_after_truncation: 5,
        started_at: '2026-01-01T09:00:00.000Z',
        finished_at: '2026-01-01T09:05:00.000Z',
      },
      created_at: new Date().toISOString(),
    });
  };

  const runWith = async (overrides: {ollama?: any; prompts?: any; settings?: any} = {}) =>
    runFinalReport({
      reportId,
      aiStorage: repo,
      aiSettings: overrides.settings ?? makeSettingsMock() as any,
      prompts: overrides.prompts ?? makePromptsMock() as any,
      ollama: overrides.ollama ?? makeOllamaMock() as any,
      signal: new AbortController().signal,
    });

  it('returns early without calling Ollama when there are no done sub-reports', async () => {
    const ollama = makeOllamaMock();
    await runWith({ollama});
    expect(ollama.chat).not.toHaveBeenCalled();
  });

  it('happy path: saves parsed final entries to storage', async () => {
    await seedDoneSub();
    await runWith();

    const entries = await repo.listFinalEntries(reportId);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('todo');
    expect((entries[0].payload as {title: string}).title).toBe('Review PR');
    expect(entries[0].conversation_ids).toContain('conv-1');
  });

  it('happy path: persisted entry has empty mutable_state', async () => {
    await seedDoneSub();
    await runWith();

    const entries = await repo.listFinalEntries(reportId);
    expect(entries[0].mutable_state).toEqual({});
  });

  it('throws OllamaToolCallMissingError when Ollama returns no tool calls', async () => {
    await seedDoneSub();
    const ollama = makeOllamaMock();
    ollama.chat.mockResolvedValue({message: {content: 'sorry', tool_calls: []}, done: true});

    await expect(runWith({ollama})).rejects.toBeInstanceOf(OllamaToolCallMissingError);
  });

  it('throws OllamaToolCallInvalidError when the tool call fails schema validation', async () => {
    await seedDoneSub();
    const badArgs = {entries: [{type: 'INVALID', title: 'x', conversation_ids: []}]};
    const ollama = makeOllamaMock({function: {name: 'report_completion', arguments: badArgs}});

    await expect(runWith({ollama})).rejects.toBeInstanceOf(OllamaToolCallInvalidError);
  });

  it('handles tool call arguments delivered as a JSON string', async () => {
    await seedDoneSub();
    const stringArgCall = {
      function: {
        name: 'report_completion',
        arguments: JSON.stringify(VALID_FINAL_CALL.function.arguments),
      },
    };
    await runWith({ollama: makeOllamaMock(stringArgCall)});

    const entries = await repo.listFinalEntries(reportId);
    expect(entries).toHaveLength(1);
  });

  it('only uses done sub-reports, skipping pending and failed ones', async () => {
    // Seed a 'done' sub-report and a 'failed' one
    await seedDoneSub();
    await repo.createSubReport({
      id: crypto.randomUUID(),
      report_id: reportId,
      conversation_id: 'conv-2',
      conversation_domain: null,
      conversation_name_snapshot: 'Conv 2',
      ai_description_snapshot: '',
      status: 'failed',
      error: 'LLM timeout',
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

    let capturedPromptArgs: unknown[] = [];
    const prompts = makePromptsMock();
    prompts.render.mockImplementation((_name: string, vars: Record<string, unknown>) => {
      capturedPromptArgs = (vars.conversations as unknown[]) ?? [];
      return Promise.resolve('prompt');
    });

    await runWith({prompts});

    // Only the 'done' sub-report should be included in the prompt
    expect(capturedPromptArgs).toHaveLength(1);
    expect((capturedPromptArgs[0] as {id: string}).id).toBe('conv-1');
  });
});
