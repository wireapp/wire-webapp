import {DexieDatabase} from 'Repositories/storage/DexieDatabase';

import {AiSettingsService} from '../script/ai/settings/AiSettingsService';
import {DEFAULTS} from '../script/ai/settings/defaults';

describe('AiSettingsService', () => {
  let db: DexieDatabase;
  let service: AiSettingsService;

  beforeEach(async () => {
    db = new DexieDatabase(`test-ai-settings-${Date.now()}-${Math.random()}`);
    await db.open();
    service = new AiSettingsService(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('default values', () => {
    it('getOllamaUrl() returns the default URL when nothing is stored', async () => {
      expect(await service.getOllamaUrl()).toBe(DEFAULTS.ollamaUrl);
    });

    it('getOllamaModel() returns the default model when nothing is stored', async () => {
      expect(await service.getOllamaModel()).toBe(DEFAULTS.ollamaModel);
    });

    it('getManualContextSize() returns the default context size', async () => {
      expect(await service.getManualContextSize()).toBe(DEFAULTS.manualContextSize);
    });

    it('getPerMessageTokenCap() returns the default cap', async () => {
      expect(await service.getPerMessageTokenCap()).toBe(DEFAULTS.perMessageTokenCap);
    });

    it('getSafetyMarginPct() returns the default safety margin', async () => {
      expect(await service.getSafetyMarginPct()).toBe(DEFAULTS.safetyMarginPct);
    });

    it('getJobDescription() returns an empty string by default', async () => {
      expect(await service.getJobDescription()).toBe(DEFAULTS.jobDescription);
    });
  });

  describe('persistence round-trips', () => {
    it('setOllamaUrl / getOllamaUrl persists the value', async () => {
      await service.setOllamaUrl('http://custom:11434');
      expect(await service.getOllamaUrl()).toBe('http://custom:11434');
    });

    it('setOllamaModel / getOllamaModel persists the value', async () => {
      await service.setOllamaModel('llama3.2:3b');
      expect(await service.getOllamaModel()).toBe('llama3.2:3b');
    });

    it('setManualContextSize / getManualContextSize persists the value', async () => {
      await service.setManualContextSize(65536);
      expect(await service.getManualContextSize()).toBe(65536);
    });

    it('setPerMessageTokenCap / getPerMessageTokenCap persists the value', async () => {
      await service.setPerMessageTokenCap(500);
      expect(await service.getPerMessageTokenCap()).toBe(500);
    });

    it('setSafetyMarginPct / getSafetyMarginPct persists the value', async () => {
      await service.setSafetyMarginPct(0.1);
      expect(await service.getSafetyMarginPct()).toBe(0.1);
    });

    it('setJobDescription / getJobDescription persists the value', async () => {
      await service.setJobDescription('Senior software engineer at ACME');
      expect(await service.getJobDescription()).toBe('Senior software engineer at ACME');
    });

    it('overwriting a value replaces the previous stored value', async () => {
      await service.setOllamaUrl('http://first:11434');
      await service.setOllamaUrl('http://second:11434');
      expect(await service.getOllamaUrl()).toBe('http://second:11434');
    });
  });

  describe('getAll()', () => {
    it('returns all default values when nothing has been configured', async () => {
      const all = await service.getAll();
      expect(all.ollamaUrl).toBe(DEFAULTS.ollamaUrl);
      expect(all.ollamaModel).toBe(DEFAULTS.ollamaModel);
      expect(all.manualContextSize).toBe(DEFAULTS.manualContextSize);
      expect(all.perMessageTokenCap).toBe(DEFAULTS.perMessageTokenCap);
      expect(all.safetyMarginPct).toBe(DEFAULTS.safetyMarginPct);
      expect(all.jobDescription).toBe(DEFAULTS.jobDescription);
    });

    it('reflects individually set values', async () => {
      await service.setOllamaModel('custom-model:7b');
      await service.setJobDescription('Data analyst');
      const all = await service.getAll();
      expect(all.ollamaModel).toBe('custom-model:7b');
      expect(all.jobDescription).toBe('Data analyst');
      // Unset values remain at defaults
      expect(all.ollamaUrl).toBe(DEFAULTS.ollamaUrl);
    });
  });
});
