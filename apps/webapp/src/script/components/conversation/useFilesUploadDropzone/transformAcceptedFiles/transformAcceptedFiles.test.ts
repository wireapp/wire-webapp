import {transformAcceptedFiles} from './transformAcceptedFiles';

const createObjectURL = URL.createObjectURL;

describe('transformAcceptedFiles', () => {
  beforeEach(() => {
    URL.createObjectURL = jest.fn((file: File) => {
      return `blob:${file.name}`;
    });
  });

  afterEach(() => {
    URL.createObjectURL = createObjectURL;
  });

  it('adds stable local upload state and previews to every accepted file', () => {
    const files = [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')];
    const transformed = transformAcceptedFiles(files);

    expect(transformed).toHaveLength(2);
    expect(
      transformed.map(file => {
        return file.preview;
      }),
    ).toEqual(['blob:one.txt', 'blob:two.txt']);
    expect(
      transformed.every(file => {
        return file.id.length > 0;
      }),
    ).toBe(true);
    expect(
      new Set(
        transformed.map(file => {
          return file.id;
        }),
      ).size,
    ).toBe(2);
    expect(
      transformed.map(file => {
        return file.uploadStatus;
      }),
    ).toEqual(['uploading', 'uploading']);
    expect(
      transformed.map(file => {
        return file.uploadProgress;
      }),
    ).toEqual([0, 0]);
    expect(
      transformed.map(file => {
        return [file.remoteUuid, file.remoteVersionId];
      }),
    ).toEqual([
      ['', ''],
      ['', ''],
    ]);
  });
});
