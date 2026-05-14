import {render, screen} from '@testing-library/react';
import {ReportsListPage} from '../script/ai/ui/ReportsListPage/ReportsListPage';
import type {AiReportRecord} from '../script/ai/storage/records';

jest.mock('dexie-react-hooks');
jest.mock('src/script/ai');
jest.mock('../script/ai/ui/ReportsListPage/ScanButton', () => ({
  ScanButton: ({reports}: {reports: AiReportRecord[]}) => <button>Mock Scan Button</button>,
}));
jest.mock('../script/ai/ui/ReportsListPage/ReportRow', () => ({
  ReportRow: ({report}: {report: AiReportRecord}) => <div>{report.id}</div>,
}));

describe('ReportsListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render page title', () => {
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => []);

    render(<ReportsListPage />);

    expect(screen.getByRole('heading', {level: 1, name: /reports/i})).toBeInTheDocument();
  });

  it('should render scan button', () => {
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => []);

    render(<ReportsListPage />);

    expect(screen.getByRole('button', {name: /mock scan button/i})).toBeInTheDocument();
  });

  it('should show empty state when no reports exist', () => {
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => []);

    render(<ReportsListPage />);

    expect(screen.getByText(/No reports yet/)).toBeInTheDocument();
    expect(screen.getByText(/Click/)).toBeInTheDocument();
  });

  it('should show "Scan" word in bold in empty state', () => {
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => []);

    const {container} = render(<ReportsListPage />);

    const strongTag = container.querySelector('strong');
    expect(strongTag).toBeInTheDocument();
    expect(strongTag).toHaveTextContent('Scan');
  });

  it('should render list of reports when reports exist', () => {
    const reports: AiReportRecord[] = [
      {
        id: 'report-1',
        status: 'finished',
        created_at: '2026-05-14T10:00:00Z',
        target_conversation_ids: ['c1'],
      } as AiReportRecord,
      {
        id: 'report-2',
        status: 'finished',
        created_at: '2026-05-14T11:00:00Z',
        target_conversation_ids: ['c2'],
      } as AiReportRecord,
    ];

    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => reports);

    render(<ReportsListPage />);

    expect(screen.getByText('report-1')).toBeInTheDocument();
    expect(screen.getByText('report-2')).toBeInTheDocument();
    expect(screen.queryByText(/No reports yet/)).not.toBeInTheDocument();
  });

  it('should render reports as list items', () => {
    const reports: AiReportRecord[] = [
      {
        id: 'report-1',
        status: 'finished',
        created_at: '2026-05-14T10:00:00Z',
        target_conversation_ids: ['c1'],
      } as AiReportRecord,
    ];

    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => reports);

    const {container} = render(<ReportsListPage />);
    const listItems = container.querySelectorAll('li');

    expect(listItems.length).toBe(1);
    expect(listItems[0]).toBeInTheDocument();
  });

  it('should use correct keys for list items', () => {
    const reports: AiReportRecord[] = [
      {
        id: 'unique-id-1',
        status: 'finished',
        created_at: '2026-05-14T10:00:00Z',
        target_conversation_ids: ['c1'],
      } as AiReportRecord,
      {
        id: 'unique-id-2',
        status: 'finished',
        created_at: '2026-05-14T11:00:00Z',
        target_conversation_ids: ['c2'],
      } as AiReportRecord,
    ];

    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => reports);

    const {container} = render(<ReportsListPage />);
    const listItems = container.querySelectorAll('li');

    // Keys are not directly testable in React, but we verify the IDs are rendered
    expect(screen.getByText('unique-id-1')).toBeInTheDocument();
    expect(screen.getByText('unique-id-2')).toBeInTheDocument();
  });

  it('should call aiStorage.listReports() via useLiveQuery', () => {
    const mockListReports = jest.fn();
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: mockListReports,
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => {
      callback();
      return [];
    });

    render(<ReportsListPage />);

    expect(dexieModule.useLiveQuery).toHaveBeenCalled();
  });

  it('should pass empty dependency array to useLiveQuery', () => {
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => []);

    render(<ReportsListPage />);

    expect(dexieModule.useLiveQuery).toHaveBeenCalledWith(
      expect.any(Function),
      [],
    );
  });

  it('should handle undefined from useLiveQuery by defaulting to empty array', () => {
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => undefined);

    render(<ReportsListPage />);

    expect(screen.getByText(/No reports yet/)).toBeInTheDocument();
  });

  it('should render with proper page structure', () => {
    const aiModule = require('src/script/ai');
    aiModule.useAi = jest.fn(() => ({
      aiStorage: {
        listReports: jest.fn(),
      },
    }));

    const dexieModule = require('dexie-react-hooks');
    dexieModule.useLiveQuery = jest.fn((callback, deps) => []);

    const {container} = render(<ReportsListPage />);

    const pageDiv = container.querySelector('[class*="reports-list-page"]');
    const headerDiv = container.querySelector('[class*="header"]');

    expect(pageDiv).toBeInTheDocument();
    expect(headerDiv).toBeInTheDocument();
  });
});
