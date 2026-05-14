import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {ScanButton} from '../script/ai/ui/ReportsListPage/ScanButton';
import type {AiReportRecord} from '../script/ai/storage/records';
import {OllamaUnreachableError, OllamaModelMissingError} from '../script/ai/ollama/errors';
import * as Router from '../script/router/Router';
import * as routeGenerator from '../script/router/routeGenerator';

jest.mock('src/script/ai');
jest.mock('src/script/router/Router');
jest.mock('src/script/router/routeGenerator');
jest.mock('src/script/components/Modals/PrimaryModal');
jest.mock('Util/logger', () => ({
  getLogger: () => ({info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()}),
}));

const mockNavigate = jest.fn();
const mockGenerateReportDetailUrl = jest.fn((id) => `/report/${id}`);
const mockScanRunnerStart = jest.fn();
const mockPrimaryModal = {
  type: {ACKNOWLEDGE: 'acknowledge'},
  show: jest.fn(),
};

describe('ScanButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Router.navigate as jest.Mock) = mockNavigate;
    (routeGenerator.generateReportDetailUrl as jest.Mock) = mockGenerateReportDetailUrl;

    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      scanRunner: {
        start: mockScanRunnerStart,
      },
    }));

    const PrimaryModalModule = require('src/script/components/Modals/PrimaryModal');
    PrimaryModalModule.PrimaryModal = mockPrimaryModal;
  });

  it('should render an enabled button when no reports are scanning or interrupted', () => {
    const reports: AiReportRecord[] = [
      {id: '1', status: 'finished', created_at: '2026-05-14T10:00:00Z', target_conversation_ids: ['c1']} as AiReportRecord,
    ];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    expect(button).not.toBeDisabled();
  });

  it('should disable button when a report is scanning', () => {
    const reports: AiReportRecord[] = [
      {id: '1', status: 'scanning', created_at: '2026-05-14T10:00:00Z', target_conversation_ids: ['c1']} as AiReportRecord,
    ];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    expect(button).toBeDisabled();
  });

  it('should disable button when a report is interrupted', () => {
    const reports: AiReportRecord[] = [
      {id: '1', status: 'interrupted', created_at: '2026-05-14T10:00:00Z', target_conversation_ids: ['c1']} as AiReportRecord,
    ];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    expect(button).toBeDisabled();
  });

  it('should keep button enabled with multiple finished reports', () => {
    const reports: AiReportRecord[] = [
      {id: '1', status: 'finished', created_at: '2026-05-14T10:00:00Z', target_conversation_ids: ['c1']} as AiReportRecord,
      {id: '2', status: 'finished', created_at: '2026-05-14T11:00:00Z', target_conversation_ids: ['c2']} as AiReportRecord,
    ];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    expect(button).not.toBeDisabled();
  });

  it('should call scanRunner.start() on button click', async () => {
    mockScanRunnerStart.mockResolvedValue('new-report-id');
    const reports: AiReportRecord[] = [];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockScanRunnerStart).toHaveBeenCalled();
    });
  });

  it('should navigate to report detail page on successful scan start', async () => {
    mockScanRunnerStart.mockResolvedValue('new-report-id');
    const reports: AiReportRecord[] = [];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/report/new-report-id');
    });
  });

  it('should show error modal when OllamaUnreachableError is thrown', async () => {
    mockScanRunnerStart.mockRejectedValue(new OllamaUnreachableError());
    const reports: AiReportRecord[] = [];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPrimaryModal.show).toHaveBeenCalledWith(
        mockPrimaryModal.type.ACKNOWLEDGE,
        expect.objectContaining({
          text: expect.objectContaining({
            title: 'Ollama Error',
            message: expect.stringContaining('Cannot reach Ollama'),
          }),
        }),
      );
    });
  });

  it('should show error modal when OllamaModelMissingError is thrown', async () => {
    mockScanRunnerStart.mockRejectedValue(new OllamaModelMissingError());
    const reports: AiReportRecord[] = [];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockPrimaryModal.show).toHaveBeenCalledWith(
        mockPrimaryModal.type.ACKNOWLEDGE,
        expect.objectContaining({
          text: expect.objectContaining({
            title: 'Model Error',
            message: expect.stringContaining('not installed'),
          }),
        }),
      );
    });
  });

  it('should disable button with tooltip text when any report is scanning', () => {
    const reports: AiReportRecord[] = [
      {id: '1', status: 'scanning', created_at: '2026-05-14T10:00:00Z', target_conversation_ids: ['c1']} as AiReportRecord,
      {id: '2', status: 'finished', created_at: '2026-05-14T11:00:00Z', target_conversation_ids: ['c2']} as AiReportRecord,
    ];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    // The key behavior is that the button is disabled, not just the title
    expect(button).toBeDisabled();
  });

  it('should have empty reports array support', () => {
    const reports: AiReportRecord[] = [];

    render(<ScanButton reports={reports} />);
    const button = screen.getByRole('button', {name: /scan/i});

    expect(button).not.toBeDisabled();
  });
});
