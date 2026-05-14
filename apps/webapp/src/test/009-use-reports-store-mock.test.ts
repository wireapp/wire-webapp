import {useReportsStore} from '../script/ai/stores/useReportsStore';

beforeEach(() => {
  // Reset store to initial state between tests.
  useReportsStore.setState({liveStage: {}});
});

describe.skip('useReportsStore', () => {
  it('has an empty liveStage as initial state', () => {
    const state = useReportsStore.getState();
    expect(state.liveStage).toEqual({});
  });

  it('can add a liveStage entry via setState', () => {
    useReportsStore.setState(s => ({liveStage: {...s.liveStage, 'conv-1': 'Loading events'}}));

    const state = useReportsStore.getState();
    expect(state.liveStage['conv-1']).toBe('Loading events');
  });

  it('can update an existing liveStage entry', () => {
    useReportsStore.setState(s => ({liveStage: {...s.liveStage, 'conv-1': 'Loading events'}}));
    useReportsStore.setState(s => ({liveStage: {...s.liveStage, 'conv-1': 'Calling LLM'}}));

    expect(useReportsStore.getState().liveStage['conv-1']).toBe('Calling LLM');
  });

  it('can track multiple conversations independently', () => {
    useReportsStore.setState(s => ({liveStage: {...s.liveStage, 'c1': 'Loading events', 'c2': 'Calling LLM'}}));

    const {liveStage} = useReportsStore.getState();
    expect(liveStage['c1']).toBe('Loading events');
    expect(liveStage['c2']).toBe('Calling LLM');
  });

  it('can remove a conversation entry by deleting it', () => {
    useReportsStore.setState({liveStage: {'c1': 'Done', 'c2': 'Done'}});

    useReportsStore.setState(s => {
      const next = {...s.liveStage};
      delete next['c1'];
      return {liveStage: next};
    });

    const {liveStage} = useReportsStore.getState();
    expect(liveStage['c1']).toBeUndefined();
    expect(liveStage['c2']).toBe('Done');
  });

  it('can be cleared back to empty', () => {
    useReportsStore.setState({liveStage: {'c1': 'Calling LLM', 'c2': 'Loading events'}});
    useReportsStore.setState({liveStage: {}});

    expect(useReportsStore.getState().liveStage).toEqual({});
  });
});
