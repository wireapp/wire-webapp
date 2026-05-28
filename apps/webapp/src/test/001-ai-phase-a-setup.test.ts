const fs = require('fs');
const path = require('path');

describe('AI Feature Phase A - Setup Verification', () => {
  const aiRoot = path.join(__dirname, '../script/ai');
  const webappRoot = path.join(__dirname, '../..');

  it('should have all required npm packages installed', () => {
    const packageJsonPath = path.join(webappRoot, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    // Check runtime dependencies
    expect(packageJson.dependencies).toHaveProperty('handlebars');
    expect(packageJson.dependencies).toHaveProperty('zod-to-json-schema');
    expect(packageJson.dependencies).toHaveProperty('gpt-tokenizer');
    expect(packageJson.dependencies).toHaveProperty('dexie-react-hooks');

    // Check devDependencies
    expect(packageJson.devDependencies).toHaveProperty('fake-indexeddb');
  });

  it('should have the root ai/ directory structure', () => {
    expect(fs.existsSync(aiRoot)).toBe(true);
    expect(fs.statSync(aiRoot).isDirectory()).toBe(true);
  });

  it('should have all required subdirectories in ai/', () => {
    const requiredDirs = [
      'domain',
      'storage',
      'settings',
      'prompts',
      'ollama',
      'tokenizer',
      'transcript',
      'pipeline',
      'stores',
      'ui',
      '__tests__',
    ];

    requiredDirs.forEach(dir => {
      const dirPath = path.join(aiRoot, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });
  });

  it('should have nested storage/records directory', () => {
    const recordsDir = path.join(aiRoot, 'storage', 'records');
    expect(fs.existsSync(recordsDir)).toBe(true);
    expect(fs.statSync(recordsDir).isDirectory()).toBe(true);
  });

  it('should have nested ui subdirectories', () => {
    const uiSubDirs = ['ReportsListPage', 'ReportDetailPage', 'AiPreferences', 'ConversationAiOptions', 'shared'];

    uiSubDirs.forEach(dir => {
      const dirPath = path.join(aiRoot, 'ui', dir);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });
  });

  it('should have ReportDetailPage/tabs subdirectory', () => {
    const tabsDir = path.join(aiRoot, 'ui', 'ReportDetailPage', 'tabs');
    expect(fs.existsSync(tabsDir)).toBe(true);
    expect(fs.statSync(tabsDir).isDirectory()).toBe(true);
  });

  it('should have root level index.ts and README.md', () => {
    expect(fs.existsSync(path.join(aiRoot, 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(aiRoot, 'README.md'))).toBe(true);
  });

  it('should have all required placeholder files in domain/', () => {
    const domainFiles = ['EntryTypes.ts', 'ReportStatus.ts', 'getEffectiveAiEnabled.ts', 'index.ts'];

    domainFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'domain', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in storage/', () => {
    const storageFiles = ['AiStorageRepository.ts', 'index.ts'];
    const recordFiles = [
      'AiReportRecord.ts',
      'AiConversationSubReportRecord.ts',
      'AiFinalReportEntryRecord.ts',
      'AiConversationSettingsRecord.ts',
      'AiSettingsRecord.ts',
      'AiPromptTemplateRecord.ts',
      'index.ts',
    ];

    storageFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'storage', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    recordFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'storage', 'records', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in settings/', () => {
    const settingsFiles = ['AiSettingsService.ts', 'defaults.ts', 'index.ts'];

    settingsFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'settings', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in prompts/', () => {
    const promptFiles = ['subReport.hbs.ts', 'finalReport.hbs.ts', 'PromptService.ts', 'index.ts'];

    promptFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'prompts', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in ollama/', () => {
    const ollamaFiles = ['OllamaClient.ts', 'OllamaTypes.ts', 'errors.ts', 'index.ts'];

    ollamaFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'ollama', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in tokenizer/', () => {
    const tokenizerFiles = ['tokenize.ts', 'budget.ts', 'truncate.ts', 'index.ts'];

    tokenizerFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'tokenizer', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in transcript/', () => {
    const transcriptFiles = ['buildTranscript.ts', 'index.ts'];

    transcriptFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'transcript', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in pipeline/', () => {
    const pipelineFiles = [
      'ScanRunner.ts',
      'selectConversationsToScan.ts',
      'runSubReport.ts',
      'runFinalReport.ts',
      'ConsecutiveFailureTracker.ts',
      'index.ts',
    ];

    pipelineFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'pipeline', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in stores/', () => {
    const storesFiles = ['useReportsStore.ts', 'useAiSettingsDraftStore.ts', 'index.ts'];

    storesFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'stores', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in ui/ReportsListPage/', () => {
    const reportListFiles = ['ReportsListPage.tsx', 'ReportRow.tsx', 'ScanButton.tsx', 'ReportsListPage.styles.ts'];

    reportListFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'ui', 'ReportsListPage', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in ui/ReportDetailPage/', () => {
    const reportDetailFiles = [
      'ReportDetailPage.tsx',
      'ConversationSubReportView.tsx',
      'ReportDetailPage.styles.ts',
    ];
    const tabFiles = ['ReportTab.tsx', 'ConversationsTab.tsx', 'TodosTab.tsx', 'TicketsTab.tsx'];

    reportDetailFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'ui', 'ReportDetailPage', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    tabFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'ui', 'ReportDetailPage', 'tabs', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in ui/AiPreferences/', () => {
    const prefFiles = [
      'AiPreferences.tsx',
      'OllamaConnectionSection.tsx',
      'JobDescriptionSection.tsx',
      'PromptsSection.tsx',
      'AiPreferences.styles.ts',
    ];

    prefFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'ui', 'AiPreferences', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in ui/ConversationAiOptions/', () => {
    const convOptFiles = ['AiEnabledToggle.tsx', 'AiDescriptionLink.tsx', 'AiDescriptionPanel.tsx'];

    convOptFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'ui', 'ConversationAiOptions', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder files in ui/shared/', () => {
    const sharedFiles = ['ProgressBar.tsx', 'EntryCard.tsx'];

    sharedFiles.forEach(file => {
      const filePath = path.join(aiRoot, 'ui', 'shared', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('should have all required placeholder test files in __tests__/', () => {
    const testFiles = [
      'EntryTypes.test.ts',
      'getEffectiveAiEnabled.test.ts',
      'budget.test.ts',
      'truncate.test.ts',
      'buildTranscript.test.ts',
      'AiStorageRepository.test.ts',
      'ScanRunner.test.ts',
    ];

    testFiles.forEach(file => {
      const filePath = path.join(aiRoot, '__tests__', file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('placeholder files should have valid export syntax', () => {
    const filesToCheck = [
      path.join(aiRoot, 'index.ts'),
      path.join(aiRoot, 'domain', 'index.ts'),
      path.join(aiRoot, 'storage', 'AiStorageRepository.ts'),
      path.join(aiRoot, 'ui', 'ReportsListPage', 'ReportsListPage.tsx'),
    ];

    filesToCheck.forEach(filePath => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const isValidFile = content.includes('export') || content.includes('// Placeholder');
      expect(isValidFile).toBe(true);
    });
  });
});
