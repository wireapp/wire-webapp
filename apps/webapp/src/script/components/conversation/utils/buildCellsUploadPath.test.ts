import {buildCellsUploadPath} from './buildCellsUploadPath';

const params = {
  conversationId: 'local-conversation-id',
  conversationQualifiedId: {id: 'qualified-conversation-id', domain: 'example.com'},
  cellsWireDomain: 'cells.wire.example',
};

describe('buildCellsUploadPath', () => {
  it.each([
    {isDevelopment: true, expected: 'local-conversation-id@cells.wire.example'},
    {isDevelopment: false, expected: 'qualified-conversation-id@example.com'},
  ])('selects the same environment-specific path for initial uploads and retries', ({isDevelopment, expected}) => {
    const initialPath = buildCellsUploadPath({...params, isDevelopment});
    const retryPath = buildCellsUploadPath({...params, isDevelopment});

    expect(initialPath).toBe(expected);
    expect(retryPath).toBe(initialPath);
  });
});
