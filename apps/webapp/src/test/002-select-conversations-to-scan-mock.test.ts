import {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {selectConversationsToScan} from '../script/ai/pipeline/selectConversationsToScan';
import {AiStorageRepository} from '../script/ai/storage/AiStorageRepository';

jest.mock('Util/logger', () => ({
  getLogger: () => ({info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()}),
}));

const makeConv = (
  id: string,
  opts: {archived?: boolean; hasService?: boolean} = {},
) => ({
  id,
  domain: null,
  is_archived: () => opts.archived ?? false,
  hasService: opts.hasService ?? false,
  display_name: () => `Conv ${id}`,
  participating_user_ets: () => [],
  qualifiedId: {id, domain: ''},
});

const makeConversationState = (convs: ReturnType<typeof makeConv>[]) => ({
  conversations: jest.fn().mockReturnValue(convs),
});

describe('selectConversationsToScan', () => {
  let db: DexieDatabase;
  let repo: AiStorageRepository;

  beforeEach(async () => {
    db = new DexieDatabase(`test-select-${Date.now()}-${Math.random()}`);
    await db.open();
    repo = new AiStorageRepository(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('includes a regular conversation with no explicit settings (ai_enabled defaults to true)', async () => {
    const convs = [makeConv('c1')];
    const state = makeConversationState(convs);
    const result = await selectConversationsToScan(state as any, repo);
    expect(result.map(c => c.id)).toEqual(['c1']);
  });

  it('excludes archived conversations regardless of AI settings', async () => {
    const convs = [makeConv('c1', {archived: true}), makeConv('c2')];
    const state = makeConversationState(convs);
    const result = await selectConversationsToScan(state as any, repo);
    expect(result.map(c => c.id)).toEqual(['c2']);
  });

  it('excludes conversations with hasService=true and no explicit settings (bot conversations)', async () => {
    const convs = [makeConv('c1', {hasService: true})];
    const state = makeConversationState(convs);
    const result = await selectConversationsToScan(state as any, repo);
    expect(result).toHaveLength(0);
  });

  it('includes bot conversations when explicitly opted in via settings', async () => {
    await repo.upsertConversationSettings({
      conversation_id: 'c1',
      ai_enabled: true,
      ai_description: 'allowed bot',
    });
    const convs = [makeConv('c1', {hasService: true})];
    const state = makeConversationState(convs);
    const result = await selectConversationsToScan(state as any, repo);
    expect(result.map(c => c.id)).toEqual(['c1']);
  });

  it('excludes conversations explicitly opted out via settings', async () => {
    await repo.upsertConversationSettings({
      conversation_id: 'c1',
      ai_enabled: false,
      ai_description: '',
    });
    const convs = [makeConv('c1')];
    const state = makeConversationState(convs);
    const result = await selectConversationsToScan(state as any, repo);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when there are no conversations', async () => {
    const state = makeConversationState([]);
    const result = await selectConversationsToScan(state as any, repo);
    expect(result).toEqual([]);
  });

  it('filters correctly across a mixed set of conversations', async () => {
    await repo.upsertConversationSettings({
      conversation_id: 'opted-out',
      ai_enabled: false,
      ai_description: '',
    });
    const convs = [
      makeConv('normal'),
      makeConv('opted-out'),
      makeConv('archived', {archived: true}),
      makeConv('service-bot', {hasService: true}),
    ];
    const state = makeConversationState(convs);
    const result = await selectConversationsToScan(state as any, repo);
    // Only 'normal' passes all filters
    expect(result.map(c => c.id)).toEqual(['normal']);
  });
});
