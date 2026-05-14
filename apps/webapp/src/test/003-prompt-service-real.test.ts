import {DexieDatabase} from 'Repositories/storage/DexieDatabase';
import {PromptService} from '../script/ai/prompts/PromptService';

describe('PromptService', () => {
  let db: DexieDatabase;
  let service: PromptService;

  beforeEach(async () => {
    db = new DexieDatabase(`test-prompt-service-${Date.now()}-${Math.random()}`);
    await db.open();
    service = new PromptService(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('render sub_report template', () => {
    it('renders without throwing given minimal variables', async () => {
      const result = await service.render('sub_report', {
        user_job_description: 'engineer',
        conversation_kind: 'group',
        conversation_name: 'Engineering Chat',
        ai_description: '',
        participants: [],
        transcript: 'Alice: hello\nBob: world',
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('substitutes user_job_description into the output', async () => {
      const result = await service.render('sub_report', {
        user_job_description: 'UNIQUE_JOB_LABEL',
        conversation_kind: 'group',
        conversation_name: 'Test',
        ai_description: '',
        participants: [],
        transcript: '',
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(result).toContain('UNIQUE_JOB_LABEL');
    });

    it('substitutes conversation_name into the output', async () => {
      const result = await service.render('sub_report', {
        user_job_description: 'engineer',
        conversation_kind: 'group',
        conversation_name: 'UNIQUE_CONV_NAME',
        ai_description: '',
        participants: [],
        transcript: '',
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(result).toContain('UNIQUE_CONV_NAME');
    });

    it('includes the transcript verbatim in the output', async () => {
      const transcript = 'alice: MARKER_LINE_ONE\nbob: MARKER_LINE_TWO';
      const result = await service.render('sub_report', {
        user_job_description: 'engineer',
        conversation_kind: '1-to-1',
        conversation_name: 'Test',
        ai_description: '',
        participants: [],
        transcript,
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(result).toContain('MARKER_LINE_ONE');
      expect(result).toContain('MARKER_LINE_TWO');
    });

    it('includes ai_description block when provided', async () => {
      const result = await service.render('sub_report', {
        user_job_description: 'engineer',
        conversation_kind: 'group',
        conversation_name: 'Test',
        ai_description: 'SPECIAL_CONTEXT_TEXT',
        participants: [],
        transcript: '',
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(result).toContain('SPECIAL_CONTEXT_TEXT');
    });

    it('renders participant handles when provided', async () => {
      const result = await service.render('sub_report', {
        user_job_description: 'engineer',
        conversation_kind: 'group',
        conversation_name: 'Test',
        ai_description: '',
        participants: [{handle: 'alice', name: 'Alice Smith', qualified_id: {id: 'u1', domain: ''}}],
        transcript: '',
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(result).toContain('@alice');
    });
  });

  describe('render final_report template', () => {
    it('renders without throwing given minimal variables', async () => {
      const result = await service.render('final_report', {
        user_job_description: 'engineer',
        conversations: [],
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('includes conversation names in the final report', async () => {
      const result = await service.render('final_report', {
        user_job_description: 'engineer',
        conversations: [
          {id: 'c1', name: 'UNIQUE_CONV_X', kind: 'group', ai_description: '', entries_json: '[]'},
        ],
        example_tool_call_json: '{}',
        iso_now: '2026-01-01T00:00:00.000Z',
      });
      expect(result).toContain('UNIQUE_CONV_X');
    });
  });
});
