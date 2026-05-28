import React from 'react';
import {render, fireEvent, waitFor} from '@testing-library/react';
import {ReportRow} from 'src/script/ai/ui/ReportsListPage/ReportRow';
import * as aiModule from 'src/script/ai';
import * as routerModule from 'src/script/router/Router';
import * as routeGeneratorModule from 'src/script/router/routeGenerator';
import {OllamaUnreachableError, OllamaModelMissingError} from 'src/script/ai/ollama/errors';

import {useAppNotification} from 'Components/AppNotification';

jest.mock('dexie-react-hooks');
jest.mock('src/script/ai');
jest.mock('src/script/router/Router');
jest.mock('src/script/router/routeGenerator');
jest.mock('Components/AppNotification', () => ({
  useAppNotification: jest.fn(),
}));

import {useLiveQuery} from 'dexie-react-hooks';

describe('ReportRow', () => {
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

  const mockReport = createMockReport();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(aiModule.useAi).mockReturnValue({
      scanRunner: mockScanRunner,
      aiStorage: mockAiStorage,
    });
    jest.mocked(useAppNotification).mockReturnValue({show: mockShow, close: jest.fn()});
    jest.mocked(routeGeneratorModule.generateReportDetailUrl).mockImplementation(id => `/report/${id}`);
    jest.mocked(useLiveQuery).mockReturnValue([]);
  });

  it('should render report title with formatted date', () => {
    const {getByText} = render(React.createElement(ReportRow, {report: mockReport}));

    const titleElement = getByText(/Report from/);
    expect(titleElement).toBeInTheDocument();
  });

  it('should display status badge with correct text', () => {
    const {container} = render(React.createElement(ReportRow, {report: mockReport}));

    expect(container.textContent).toContain('finished');
  });

  it('should render chevron button to navigate to report', () => {
    const {getByRole} = render(React.createElement(ReportRow, {report: mockReport}));
    const chevronButton = getByRole('button', {name: /view report details/i});

    expect(chevronButton).toBeInTheDocument();
  });

  it('should navigate to report detail on chevron click', () => {
    const {getByRole} = render(React.createElement(ReportRow, {report: mockReport}));
    const chevronButton = getByRole('button', {name: /view report details/i});

    fireEvent.click(chevronButton);

    expect(routerModule.navigate).toHaveBeenCalledWith('/report/report-1');
  });

  it('should not show resume button when status is finished', () => {
    const {queryByRole} = render(React.createElement(ReportRow, {report: mockReport}));
    const resumeButton = queryByRole('button', {name: /resume/i});

    expect(resumeButton).not.toBeInTheDocument();
  });

  it('should show resume button when status is interrupted', () => {
    const interruptedReport = createMockReport({status: 'interrupted'});
    const {getByRole} = render(React.createElement(ReportRow, {report: interruptedReport}));
    const resumeButton = getByRole('button', {name: /resume/i});

    expect(resumeButton).toBeInTheDocument();
  });

  it('should call scanRunner.resume on resume button click', async () => {
    const interruptedReport = createMockReport({status: 'interrupted'});
    mockScanRunner.resume.mockResolvedValue(undefined);

    const {getByRole} = render(React.createElement(ReportRow, {report: interruptedReport}));
    const resumeButton = getByRole('button', {name: /resume/i});

    fireEvent.click(resumeButton);

    await waitFor(() => {
      expect(mockScanRunner.resume).toHaveBeenCalledWith('report-1');
    });
  });

  it('should show error notification on OllamaUnreachableError during resume', async () => {
    const interruptedReport = createMockReport({status: 'interrupted'});
    mockScanRunner.resume.mockRejectedValue(new OllamaUnreachableError('error'));

    const {getByRole} = render(React.createElement(ReportRow, {report: interruptedReport}));
    const resumeButton = getByRole('button', {name: /resume/i});

    fireEvent.click(resumeButton);

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot reach Ollama. Check that Ollama is running at the configured URL.',
        }),
      );
    });
  });

  it('should show error notification on OllamaModelMissingError during resume', async () => {
    const interruptedReport = createMockReport({status: 'interrupted'});
    mockScanRunner.resume.mockRejectedValue(new OllamaModelMissingError('error'));

    const {getByRole} = render(React.createElement(ReportRow, {report: interruptedReport}));
    const resumeButton = getByRole('button', {name: /resume/i});

    fireEvent.click(resumeButton);

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'The configured Ollama model is not installed. Go to AI Preferences to change the model.',
        }),
      );
    });
  });

  it('should not render progress bar when status is not scanning', () => {
    const {container} = render(React.createElement(ReportRow, {report: mockReport}));
    const progressBar = container.querySelector('[role="progressbar"]');

    expect(progressBar).not.toBeInTheDocument();
  });

  it('should render progress bar when status is scanning', () => {
    const scanningReport = createMockReport({status: 'scanning'});
    jest.mocked(useLiveQuery).mockReturnValue([]);

    const {container} = render(React.createElement(ReportRow, {report: scanningReport}));
    const progressBar = container.querySelector('[role="progressbar"]');

    expect(progressBar).toBeInTheDocument();
  });

  it('should subscribe to live sub-reports when scanning', () => {
    const scanningReport = createMockReport({status: 'scanning'});
    jest.mocked(useLiveQuery).mockReturnValue([]);

    render(React.createElement(ReportRow, {report: scanningReport}));

    expect(useLiveQuery).toHaveBeenCalled();
  });
});
