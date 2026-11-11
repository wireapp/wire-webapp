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

import {noop} from 'noop-esm';
import type {PDFDocumentLoadingTask, RenderTask} from 'pdfjs-dist';

import {loadFileBuffer} from '../../util/util';

export interface PdfPreview {
  blob: Blob;
  width: number;
  height: number;
}

// Previews are optional. Bound work so a large or broken PDF cannot block file sharing.
const maxFileSize = 20_971_520;
const maxPreviewDimension = 640;
const maxPreviewSize = 1_048_576;
const previewTimeout = 5000;

type PdfJs = Pick<typeof import('react-pdf').pdfjs, 'getDocument'>;

const loadPdfJs = async (): Promise<PdfJs> => {
  const {pdfjs} = await import('react-pdf');
  pdfjs.GlobalWorkerOptions.workerSrc = '/min/pdf.worker.mjs';
  return pdfjs;
};

export async function createPdfPreview(
  file: Blob,
  signal: AbortSignal,
  loadPdf: () => Promise<PdfJs> = loadPdfJs,
): Promise<PdfPreview | undefined> {
  if (file.type !== 'application/pdf' || file.size > maxFileSize || signal.aborted) {
    return undefined;
  }

  let loadingTask: PDFDocumentLoadingTask | undefined;
  let renderTask: RenderTask | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let canceled = false;
  let rejectCanceled: () => void = noop;
  const cancel = (): void => {
    canceled = true;
    renderTask?.cancel();
    rejectCanceled();
  };
  const cancellation = new Promise<never>((_resolve, reject) => {
    rejectCanceled = () => {
      reject(new Error('PDF preview canceled'));
    };
  });
  const timeout = window.setTimeout(cancel, previewTimeout);
  signal.addEventListener('abort', cancel, {once: true});

  const render = async (): Promise<PdfPreview | undefined> => {
    const {getDocument} = await loadPdf();
    const buffer = await loadFileBuffer(file);
    if (canceled) {
      return undefined;
    }

    loadingTask = getDocument({data: new Uint8Array(buffer), isEvalSupported: false});
    const document = await loadingTask.promise;
    if (canceled) {
      return undefined;
    }
    const page = await document.getPage(1);
    const originalViewport = page.getViewport({scale: 1});
    const largestDimension = Math.max(originalViewport.width, originalViewport.height);
    if (!Number.isFinite(largestDimension) || largestDimension <= 0 || canceled) {
      return undefined;
    }
    const viewport = page.getViewport({scale: Math.min(1, maxPreviewDimension / largestDimension)});
    canvas = window.document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext('2d');
    if (context === null) {
      return undefined;
    }

    renderTask = page.render({canvasContext: context, viewport});
    if (canceled) {
      renderTask.cancel();
      return undefined;
    }
    await renderTask.promise;
    if (canceled) {
      return undefined;
    }
    const blob = await new Promise<Blob | null>(resolve => {
      canvas?.toBlob(resolve, 'image/png');
    });
    if (blob === null || blob.size > maxPreviewSize || canceled) {
      return undefined;
    }
    return {blob, width: canvas.width, height: canvas.height};
  };

  try {
    return await Promise.race([render(), cancellation]);
  } catch {
    // Malformed and password-protected PDFs still send as ordinary files.
    return undefined;
  } finally {
    canceled = true;
    window.clearTimeout(timeout);
    signal.removeEventListener('abort', cancel);
    await loadingTask?.destroy();
    if (canvas !== undefined) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
