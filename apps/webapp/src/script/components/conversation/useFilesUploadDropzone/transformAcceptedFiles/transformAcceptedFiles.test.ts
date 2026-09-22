import {transformAcceptedFiles} from './transformAcceptedFiles';

const createObjectURL = URL.createObjectURL;

describe('transformAcceptedFiles', () => {
  beforeEach(() => {
    URL.createObjectURL = jest.fn((file: File) => `blob:${file.name}`);
  });

  afterEach(() => {
    URL.createObjectURL = createObjectURL;
  });

  it('adds stable local upload state and previews to every accepted file', () => {
    const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')];
    const transformed = transformAcceptedFiles(files);

    expect(transformed).toHaveLength(2);
    expect(transformed.map(file => file.preview)).toEqual(['blob:one.txt', 'blob:two.txt']);
    expect(transformed.every(file => file.id.length > 0)).toBe(true);
    expect(new Set(transformed.map(file => file.id)).size).toBe(2);
    expect(transformed.map(file => file.uploadStatus)).toEqual(['uploading', 'uploading']);
    expect(transformed.map(file => file.uploadProgress)).toEqual([0, 0]);
    expect(transformed.map(file => [file.remoteUuid, file.remoteVersionId])).toEqual([
      ['', ''],
      ['', ''],
    ]);
  });
});
