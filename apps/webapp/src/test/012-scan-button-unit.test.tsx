import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react';
import {ScanButton} from 'src/script/ai/ui/ReportsListPage/ScanButton';
import * as aiModule from 'src/script/ai';
import * as routerModule from 'src/script/router/Router';
import * as routeGeneratorModule from 'src/script/router/routeGenerator';
import {OllamaUnreachableError, OllamaModelMissingError} from 'src/script/ai/ollama/errors';

import {useAppNotification} from 'Components/AppNotification';

jest.mock('src/script/ai');
jest.mock('src/script/router/Router');
jest.mock('src/script/router/routeGenerator');
jest.mock('Components/AppNotification', () => ({
  useAppNotification: jest.fn(),
}));

describe('ScanButton', () => {
  const mockScanRunner = {
    start: jest.fn(),
    resume: jest.fn(),
  };

  const mockAiStorage = {
    listReports: jest.fn(),
    listSubReports: jest.fn(),
  };

  const mockShow = jest.fn();

  const createMockReport = (overrides) => ({
    id: 'report-1',
    status: 'finished',
    created_at: '2024-04-29T15:48:00Z',
    finished_at: '2024-04-29T16:00:00Z',
    target_conversation_ids: ['conv1', 'conv2', 'conv3'],
    final_pass_started_at: null,
    final_pass_finished_at: null,
    snapshot: {
      model: 'llama2',
      context_size: 4096,
      safety_margin_pct: 10,
      per_message_token_cap: 1000,
      job_description: 'Test scan',
    },
    error: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(aiModule.useAi).mockReturnValue({
      scanRunner: mockScanRunner,
      aiStorage: mockAiStorage,
    });
    jest.mocked(useAppNotification).mockReturnValue({show: mockShow, close: jest.fn()});
    jest.mocked(routeGeneratorModule.generateReportDetailUrl).mockImplementation(id => `/report/${id}`);
  });

  it('should render enabled button when no reports are scanning or interrupted', () => {
    const {getByRole} = render(React.createElement(ScanButton, {reports: []}));
    const button = getByRole('button', {name: /scan/i});

    expect(button).not.toBeDisabled();
  });

  it('should disable button when a report is scanning', () => {
    const reports = [createMockReport({status: 'scanning'})];
    const {getByRole} = render(React.createElement(ScanButton, {reports}));
    const button = getByRole('button', {name: /scan/i});

    expect(button).toBeDisabled();
  });

  it('should disable button when a report is interrupted', () => {
    const reports = [createMockReport({status: 'interrupted'})];
    const {getByRole} = render(React.createElement(ScanButton, {reports}));
    const button = getByRole('button', {name: /scan/i});

    expect(button).toBeDisabled();
  });

  it('should enable button when all reports are finished', () => {
    const reports = [
      createMockReport({id: '1', status: 'finished'}),
      createMockReport({id: '2', status: 'finished'}),
    ];
    const {getByRole} = render(React.createElement(ScanButton, {reports}));
    const button = getByRole('button', {name: /scan/i});

    expect(button).not.toBeDisabled();
  });

  it('should call scanRunner.start() on button click', async () => {
    mockScanRunner.start.mockResolvedValue('new-report-id');

    const {getByRole} = render(React.createElement(ScanButton, {reports: []}));
    const button = getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockScanRunner.start).toHaveBeenCalled();
    });
  });

  it('should navigate to report detail after successful scan start', async () => {
    mockScanRunner.start.mockResolvedValue('new-report-id');

    const {getByRole} = render(React.createElement(ScanButton, {reports: []}));
    const button = getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(routerModule.navigate).toHaveBeenCalledWith('/report/new-report-id');
    });
  });

  it('should show error notification on OllamaUnreachableError', async () => {
    mockScanRunner.start.mockRejectedValue(new OllamaUnreachableError('error'));

    const {getByRole} = render(React.createElement(ScanButton, {reports: []}));
    const button = getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot reach Ollama. Check that Ollama is running at the configured URL.',
        }),
      );
    });
  });

  it('should show error notification on OllamaModelMissingError', async () => {
    mockScanRunner.start.mockRejectedValue(new OllamaModelMissingError('error'));

    const {getByRole} = render(React.createElement(ScanButton, {reports: []}));
    const button = getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'The configured Ollama model is not installed. Go to AI Preferences to change the model.',
        }),
      );
    });
  });

  it('should reflect disabled state changes', () => {
    const {getByRole, rerender} = render(React.createElement(ScanButton, {reports: []}));

    expect(getByRole('button', {name: /scan/i})).not.toBeDisabled();

    const scanningReports = [createMockReport({status: 'scanning'})];
    rerender(React.createElement(ScanButton, {reports: scanningReports}));

    expect(getByRole('button', {name: /scan/i})).toBeDisabled();
  });
});
