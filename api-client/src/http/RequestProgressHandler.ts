export type ProgressCallback = (progress: number) => void;

export const handleProgressEvent = (progressCallback?: ProgressCallback) => {
  return (
    progressCallback &&
    ((progressEvent: ProgressEvent) => {
      progressCallback(progressEvent.loaded / progressEvent.total);
    })
  );
};
