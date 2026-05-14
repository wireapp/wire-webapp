import {useAiSettingsDraftStore} from '../script/ai/stores/useAiSettingsDraftStore';
import {DEFAULTS} from '../script/ai/settings/defaults';

beforeEach(() => {
  // Reset to defaults between tests so each case starts clean.
  useAiSettingsDraftStore.getState().hydrate({
    ollamaUrl: DEFAULTS.ollamaUrl,
    ollamaModel: DEFAULTS.ollamaModel,
    manualContextSize: DEFAULTS.manualContextSize,
    perMessageTokenCap: DEFAULTS.perMessageTokenCap,
    safetyMarginPct: DEFAULTS.safetyMarginPct,
    jobDescription: DEFAULTS.jobDescription,
  });
});

describe.skip('useAiSettingsDraftStore — initial state', () => {
  it('initialises ollamaUrl from DEFAULTS', () => {
    expect(useAiSettingsDraftStore.getState().ollamaUrl).toBe(DEFAULTS.ollamaUrl);
  });

  it('initialises ollamaModel from DEFAULTS', () => {
    expect(useAiSettingsDraftStore.getState().ollamaModel).toBe(DEFAULTS.ollamaModel);
  });

  it('initialises manualContextSize from DEFAULTS', () => {
    expect(useAiSettingsDraftStore.getState().manualContextSize).toBe(DEFAULTS.manualContextSize);
  });

  it('initialises perMessageTokenCap from DEFAULTS', () => {
    expect(useAiSettingsDraftStore.getState().perMessageTokenCap).toBe(DEFAULTS.perMessageTokenCap);
  });

  it('initialises safetyMarginPct from DEFAULTS', () => {
    expect(useAiSettingsDraftStore.getState().safetyMarginPct).toBe(DEFAULTS.safetyMarginPct);
  });

  it('initialises jobDescription from DEFAULTS', () => {
    expect(useAiSettingsDraftStore.getState().jobDescription).toBe(DEFAULTS.jobDescription);
  });
});

describe.skip('useAiSettingsDraftStore — setters', () => {
  it('setOllamaUrl updates ollamaUrl', () => {
    useAiSettingsDraftStore.getState().setOllamaUrl('http://192.168.1.10:11434');
    expect(useAiSettingsDraftStore.getState().ollamaUrl).toBe('http://192.168.1.10:11434');
  });

  it('setOllamaModel updates ollamaModel', () => {
    useAiSettingsDraftStore.getState().setOllamaModel('llama3:8b');
    expect(useAiSettingsDraftStore.getState().ollamaModel).toBe('llama3:8b');
  });

  it('setManualContextSize updates manualContextSize', () => {
    useAiSettingsDraftStore.getState().setManualContextSize(65536);
    expect(useAiSettingsDraftStore.getState().manualContextSize).toBe(65536);
  });

  it('setPerMessageTokenCap updates perMessageTokenCap', () => {
    useAiSettingsDraftStore.getState().setPerMessageTokenCap(400);
    expect(useAiSettingsDraftStore.getState().perMessageTokenCap).toBe(400);
  });

  it('setSafetyMarginPct updates safetyMarginPct', () => {
    useAiSettingsDraftStore.getState().setSafetyMarginPct(0.1);
    expect(useAiSettingsDraftStore.getState().safetyMarginPct).toBe(0.1);
  });

  it('setJobDescription updates jobDescription', () => {
    useAiSettingsDraftStore.getState().setJobDescription('Senior engineer working on platform');
    expect(useAiSettingsDraftStore.getState().jobDescription).toBe('Senior engineer working on platform');
  });

  it('setting one field does not affect other fields', () => {
    useAiSettingsDraftStore.getState().setOllamaModel('mistral:7b');

    const state = useAiSettingsDraftStore.getState();
    expect(state.ollamaUrl).toBe(DEFAULTS.ollamaUrl);
    expect(state.manualContextSize).toBe(DEFAULTS.manualContextSize);
    expect(state.perMessageTokenCap).toBe(DEFAULTS.perMessageTokenCap);
    expect(state.safetyMarginPct).toBe(DEFAULTS.safetyMarginPct);
    expect(state.jobDescription).toBe(DEFAULTS.jobDescription);
  });
});

describe.skip('useAiSettingsDraftStore — hydrate()', () => {
  it('merges all provided fields into the store', () => {
    const overrides = {
      ollamaUrl: 'http://remote:11434',
      ollamaModel: 'phi3:mini',
      manualContextSize: 4096,
      perMessageTokenCap: 200,
      safetyMarginPct: 0.05,
      jobDescription: 'Data scientist',
    };

    useAiSettingsDraftStore.getState().hydrate(overrides);

    const state = useAiSettingsDraftStore.getState();
    expect(state.ollamaUrl).toBe(overrides.ollamaUrl);
    expect(state.ollamaModel).toBe(overrides.ollamaModel);
    expect(state.manualContextSize).toBe(overrides.manualContextSize);
    expect(state.perMessageTokenCap).toBe(overrides.perMessageTokenCap);
    expect(state.safetyMarginPct).toBe(overrides.safetyMarginPct);
    expect(state.jobDescription).toBe(overrides.jobDescription);
  });

  it('hydrate followed by a setter reflects both changes', () => {
    useAiSettingsDraftStore.getState().hydrate({
      ollamaUrl: 'http://remote:11434',
      ollamaModel: 'phi3:mini',
      manualContextSize: 4096,
      perMessageTokenCap: 200,
      safetyMarginPct: 0.05,
      jobDescription: 'Data scientist',
    });

    useAiSettingsDraftStore.getState().setOllamaModel('llama3:70b');

    expect(useAiSettingsDraftStore.getState().ollamaModel).toBe('llama3:70b');
    // Other fields from hydrate should still be intact.
    expect(useAiSettingsDraftStore.getState().ollamaUrl).toBe('http://remote:11434');
  });
});
