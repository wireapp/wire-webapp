import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {ReportRow} from '../script/ai/ui/ReportsListPage/ReportRow';
import type {AiReportRecord} from '../script/ai/storage/records';
import {OllamaUnreachableError, OllamaModelMissingError} from '../script/ai/ollama/errors';
import * as Router from '../script/router/Router';
import * as routeGenerator from '../script/router/routeGenerator';

jest.mock('dexie-react-hooks');
jest.mock('src/script/ai');
jest.mock('src/script/router/Router');
jest.mock('src/script/router/routeGenerator');
jest.mock('src/script/components/Modals/PrimaryModal');
jest.mock('Util/logger', () => ({
  getLogger: () => ({info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()}),
}));

const mockNavigate = jest.fn();
const mockGenerateReportDetailUrl = jest.fn((id) => `/report/${id}`);
const mockScanRunnerResume = jest.fn();
const mockPrimaryModal = {
  type: {ACKNOWLEDGE: 'acknowledge'},
  show: jest.fn(),
};

describe('ReportRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Router.navigate as jest.Mock) = mockNavigate;
    (routeGenerator.generateReportDetailUrl as jest.Mock) = mockGenerateReportDetailUrl;

    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listSubReports: jest.fn().mockResolvedValue([]),
      },
      scanRunner: {
        resume: mockScanRunnerResume,
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => {
      return [];
    });

    const PrimaryModalModule = require('src/script/components/Modals/PrimaryModal');
    PrimaryModalModule.PrimaryModal = mockPrimaryModal;
  });

  it('should render report date and status badge', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'finished',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1', 'c2'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);

    expect(screen.getByText(/Report from/)).toBeInTheDocument();
    expect(screen.getByText('finished')).toBeInTheDocument();
  });

  it('should render status badge with finished status', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'finished',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const badge = screen.getByText('finished');

    expect(badge).toHaveStyle({backgroundColor: '#22c55e'});
  });

  it('should render status badge with scanning status', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'scanning',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const badge = screen.getByText('scanning');

    expect(badge).toHaveStyle({backgroundColor: '#3b82f6'});
  });

  it('should render status badge with interrupted status', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'interrupted',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const badge = screen.getByText('interrupted');

    expect(badge).toHaveStyle({backgroundColor: '#f59e0b'});
  });

  it('should render status badge with failed status', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'failed',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const badge = screen.getByText('failed');

    expect(badge).toHaveStyle({backgroundColor: '#ef4444'});
  });

  it('should render chevron navigation button', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'finished',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const chevronButton = screen.getByLabelText('View report details');

    expect(chevronButton).toBeInTheDocument();
    expect(chevronButton).toHaveTextContent('›');
  });

  it('should navigate to report detail page on chevron click', () => {
    const report: AiReportRecord = {
      id: 'report-123',
      status: 'finished',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const chevronButton = screen.getByLabelText('View report details');

    fireEvent.click(chevronButton);

    expect(mockNavigate).toHaveBeenCalledWith('/report/report-123');
  });

  it('should show resume button when status is interrupted', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'interrupted',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const resumeButton = screen.getByRole('button', {name: /resume/i});

    expect(resumeButton).toBeInTheDocument();
  });

  it('should not show resume button when status is not interrupted', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'finished',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const resumeButton = screen.queryByRole('button', {name: /resume/i});

    expect(resumeButton).not.toBeInTheDocument();
  });

  it('should call scanRunner.resume() when resume button is clicked', async () => {
    mockScanRunnerResume.mockResolvedValue(undefined);
    const report: AiReportRecord = {
      id: 'report-456',
      status: 'interrupted',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const resumeButton = screen.getByRole('button', {name: /resume/i});

    fireEvent.click(resumeButton);

    await waitFor(() => {
      expect(mockScanRunnerResume).toHaveBeenCalledWith('report-456');
    });
  });

  it('should show error modal on OllamaUnreachableError during resume', async () => {
    mockScanRunnerResume.mockRejectedValue(new OllamaUnreachableError());
    const report: AiReportRecord = {
      id: '123',
      status: 'interrupted',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const resumeButton = screen.getByRole('button', {name: /resume/i});

    fireEvent.click(resumeButton);

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

  it('should show error modal on OllamaModelMissingError during resume', async () => {
    mockScanRunnerResume.mockRejectedValue(new OllamaModelMissingError());
    const report: AiReportRecord = {
      id: '123',
      status: 'interrupted',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    render(<ReportRow report={report} />);
    const resumeButton = screen.getByRole('button', {name: /resume/i});

    fireEvent.click(resumeButton);

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

  it('should render row with correct accessibility structure', () => {
    const report: AiReportRecord = {
      id: '123',
      status: 'finished',
      created_at: '2026-05-14T10:30:00Z',
      target_conversation_ids: ['c1'],
    } as AiReportRecord;

    const {container} = render(<ReportRow report={report} />);
    const row = container.querySelector('[class*="row"]');

    expect(row).toBeInTheDocument();
  });
});
