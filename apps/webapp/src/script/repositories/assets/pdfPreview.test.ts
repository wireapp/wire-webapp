/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import type {pdfjs} from 'react-pdf';
import {noop} from 'noop-esm';
import {requireValueForTest} from '../../page/testSupport/rootContextTestSupport';

import {createPdfPreview} from './pdfPreview';

describe('createPdfPreview', () => {
  const getDocument = jest.fn<ReturnType<typeof pdfjs.getDocument>, Parameters<typeof pdfjs.getDocument>>();
  const loadPdf = (): Promise<Pick<typeof pdfjs, 'getDocument'>> => {
    return Promise.resolve({getDocument});
  };
  const render = jest.fn();
  const destroy = jest.fn().mockResolvedValue(undefined);
  const getPage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => {
      callback(new Blob(['png'], {type: 'image/png'}));
    });
    getPage.mockResolvedValue({
      getViewport: ({scale}: {scale: number}) => {
        return {width: 1200 * scale, height: 1800 * scale};
      },
      render,
    });
    render.mockReturnValue({promise: Promise.resolve(), cancel: jest.fn()});
    getDocument.mockReturnValue({
      promise: Promise.resolve({getPage}),
      destroy,
    } as unknown as ReturnType<typeof pdfjs.getDocument>);
  });

  it('renders only the first page into a bounded PNG and releases the PDF', async () => {
    const file = new Blob(['%PDF-1.7'], {type: 'application/pdf'});

    const preview = await createPdfPreview(file, new AbortController().signal, loadPdf);

    expect(getPage).toHaveBeenCalledWith(1);
    expect(preview?.blob.type).toBe('image/png');
    expect(preview?.width).toBeLessThanOrEqual(640);
    expect(preview?.height).toBeLessThanOrEqual(640);
    expect(preview?.blob.size).toBeGreaterThan(0);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Blob(['text'], {type: 'text/plain'}),
    new Blob([new Uint8Array(20 * 1024 * 1024 + 1)], {type: 'application/pdf'}),
  ])('skips unsupported or oversized files without starting PDF.js', async file => {
    await expect(createPdfPreview(file, new AbortController().signal, loadPdf)).resolves.toBeUndefined();
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('releases password-protected or malformed documents without a preview', async () => {
    getDocument.mockImplementation(() => {
      return {
        promise: Promise.reject(new Error('Password required')),
        destroy,
      } as unknown as ReturnType<typeof pdfjs.getDocument>;
    });

    await expect(
      createPdfPreview(new Blob(['invalid'], {type: 'application/pdf'}), new AbortController().signal, loadPdf),
    ).resolves.toBeUndefined();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('stops slow rendering after the preview time budget', async () => {
    const timer = jest.spyOn(window, 'setTimeout');
    const cancel = jest.fn();
    let markStarted: () => void = noop;
    const started = new Promise<void>(resolve => {
      markStarted = resolve;
    });
    render.mockImplementation(() => {
      markStarted();
      return {promise: new Promise<never>(noop), cancel};
    });
    const result = createPdfPreview(
      new Blob(['%PDF'], {type: 'application/pdf'}),
      new AbortController().signal,
      loadPdf,
    );
    await started;
    const [expire] = requireValueForTest(
      timer.mock.calls.find(([, delay]) => {
        return delay === 5000;
      }),
    );

    (expire as () => void)();

    await expect(result).resolves.toBeUndefined();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(destroy).toHaveBeenCalledTimes(1);
    timer.mockRestore();
  });

  it('does not start rendering when canceled', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      createPdfPreview(new Blob(['%PDF'], {type: 'application/pdf'}), controller.signal, loadPdf),
    ).resolves.toBeUndefined();
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('cancels pending rendering and releases the document when aborted', async () => {
    const controller = new AbortController();
    const cancel = jest.fn();
    render.mockImplementation(() => {
      controller.abort();
      return {promise: Promise.resolve(), cancel};
    });

    await expect(
      createPdfPreview(new Blob(['%PDF'], {type: 'application/pdf'}), controller.signal, loadPdf),
    ).resolves.toBeUndefined();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
