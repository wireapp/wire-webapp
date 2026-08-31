import {useFileUploadState, FileWithPreview} from './useFilesUploadState';

const file = (id: string): FileWithPreview =>
  Object.assign(new File(['content'], `${id}.txt`, {type: 'text/plain'}), {
    id,
    preview: `blob:${id}`,
    remoteUuid: '',
    remoteVersionId: '',
    uploadStatus: 'uploading' as const,
    uploadProgress: 0,
  });

describe('useFileUploadState', () => {
  beforeEach(() => useFileUploadState.getState().clearAll({conversationId: 'conversation'}));

  it('stores and updates upload progress and remote identifiers', () => {
    const upload = file('local-id');
    useFileUploadState.getState().addFiles({conversationId: 'conversation', files: [upload]});

    useFileUploadState.getState().updateFile({
      conversationId: 'conversation',
      fileId: upload.id,
      data: {uploadProgress: 42, remoteUuid: 'remote-id', remoteVersionId: 'version-id', uploadStatus: 'success'},
    });

    expect(useFileUploadState.getState().getFiles({conversationId: 'conversation'})[0]).toMatchObject({
      id: 'local-id',
      uploadProgress: 42,
      remoteUuid: 'remote-id',
      remoteVersionId: 'version-id',
      uploadStatus: 'success',
    });
  });

  it('removes only the cancelled or deleted file', () => {
    useFileUploadState.getState().addFiles({conversationId: 'conversation', files: [file('first'), file('second')]});
    useFileUploadState.getState().deleteFile({conversationId: 'conversation', fileId: 'first'});
    expect(
      useFileUploadState
        .getState()
        .getFiles({conversationId: 'conversation'})
        .map(({id}) => id),
    ).toEqual(['second']);
  });
});
