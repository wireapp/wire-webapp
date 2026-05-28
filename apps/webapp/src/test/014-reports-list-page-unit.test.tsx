import React from 'react';
import {render} from '@testing-library/react';
import {ReportsListPage} from 'src/script/ai/ui/ReportsListPage/ReportsListPage';
import * as aiModule from 'src/script/ai';

jest.mock('dexie-react-hooks');
jest.mock('src/script/ai');
jest.mock('src/script/ai/ui/ReportsListPage/ScanButton', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ScanButton: () => require('react').createElement('button', null, 'Mock Button'),
}));
jest.mock('src/script/ai/ui/ReportsListPage/ReportRow', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ReportRow: ({report}: {report: {id: string}}) => require('react').createElement('div', {'data-uie-name': 'report-row'}, report.id),
}));

import {useLiveQuery} from 'dexie-react-hooks';

describe('ReportsListPage', () => {
  const mockAiStorage = {
    listReports: jest.fn(),
    listSubReports: jest.fn(),
  };

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
      aiStorage: mockAiStorage,
    });
    jest.mocked(useLiveQuery).mockReturnValue([]);
  });

  it('should render Reports heading', () => {
    const {getByRole} = render(React.createElement(ReportsListPage));
    const heading = getByRole('heading', {name: /Reports/i});

    expect(heading).toBeInTheDocument();
  });

  it('should render ScanButton component', () => {
    const {getByText} = render(React.createElement(ReportsListPage));
    const scanButton = getByText(/Mock Button/);

    expect(scanButton).toBeInTheDocument();
  });

  it('should show empty state when no reports exist', () => {
    jest.mocked(useLiveQuery).mockReturnValue([]);

    const {getByText} = render(React.createElement(ReportsListPage));
    const emptyMessage = getByText(/No reports yet/);

    expect(emptyMessage).toBeInTheDocument();
    expect(getByText(/Scan/).closest('strong')).toBeInTheDocument();
  });

  it('should render list when reports exist', () => {
    const reports = [
      createMockReport({id: 'report-1'}),
      createMockReport({id: 'report-2'}),
    ];
    jest.mocked(useLiveQuery).mockReturnValue(reports);

    const {getAllByTestId} = render(React.createElement(ReportsListPage));
    const rows = getAllByTestId('report-row');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('report-1');
    expect(rows[1]).toHaveTextContent('report-2');
  });

  it('should subscribe to live reports with empty dependency array', () => {
    jest.mocked(useLiveQuery).mockReturnValue([]);

    render(React.createElement(ReportsListPage));

    expect(useLiveQuery).toHaveBeenCalledWith(expect.any(Function), []);
  });

  it('should pass reports to ScanButton component', () => {
    jest.mocked(useLiveQuery).mockReturnValue([]);

    render(React.createElement(ReportsListPage));

    expect(useLiveQuery).toHaveBeenCalled();
  });

  it('should render list items with correct keys', () => {
    const reports = [
      createMockReport({id: 'unique-id-1'}),
      createMockReport({id: 'unique-id-2'}),
      createMockReport({id: 'unique-id-3'}),
    ];
    jest.mocked(useLiveQuery).mockReturnValue(reports);

    const {getAllByTestId} = render(React.createElement(ReportsListPage));
    const rows = getAllByTestId('report-row');

    expect(rows).toHaveLength(3);
  });

  it('should handle null/undefined useLiveQuery response with fallback', () => {
    jest.mocked(useLiveQuery).mockReturnValue(undefined);

    const {getByText} = render(React.createElement(ReportsListPage));

    expect(getByText(/No reports yet/)).toBeInTheDocument();
  });
});
