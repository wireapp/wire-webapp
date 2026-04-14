/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {choosePipeline, detectCapabilities} from './capability';
import {CapabilityInfo} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';

describe('capability', () => {
  // Store original globals to restore after tests
  const originalOffscreenCanvas = global.OffscreenCanvas;
  const originalWorker = global.Worker;
  const originalHTMLVideoElement = global.HTMLVideoElement;
  const originalDocument = global.document;

  beforeEach(() => {
    // Reset globals before each test using Object.defineProperty for safer mocking
    Object.defineProperty(global, 'OffscreenCanvas', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'Worker', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(global, 'HTMLVideoElement', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    // Don't delete document/window as jsdom needs them - just mock their methods
  });

  afterEach(() => {
    // Restore original globals
    if (originalOffscreenCanvas !== undefined) {
      Object.defineProperty(global, 'OffscreenCanvas', {
        value: originalOffscreenCanvas,
        writable: true,
        configurable: true,
      });
    } else {
      delete (global as any).OffscreenCanvas;
    }
    if (originalWorker !== undefined) {
      Object.defineProperty(global, 'Worker', {
        value: originalWorker,
        writable: true,
        configurable: true,
      });
    } else {
      delete (global as any).Worker;
    }
    if (originalHTMLVideoElement !== undefined) {
      Object.defineProperty(global, 'HTMLVideoElement', {
        value: originalHTMLVideoElement,
        writable: true,
        configurable: true,
      });
    } else {
      delete (global as any).HTMLVideoElement;
    }
    if (originalDocument !== undefined) {
      (global as any).document = originalDocument;
    } else {
      delete (global as any).document;
    }
    // Restore document methods
    jest.restoreAllMocks();
  });

  describe('detectCapabilities', () => {
    it('detects all capabilities when all are available', () => {
      // Mock OffscreenCanvas
      Object.defineProperty(global, 'OffscreenCanvas', {
        value: class {},
        writable: true,
        configurable: true,
      });
      // Mock Worker
      Object.defineProperty(global, 'Worker', {
        value: class {},
        writable: true,
        configurable: true,
      });
      // Mock HTMLVideoElement with requestVideoFrameCallback
      class MockHTMLVideoElement {}
      Object.defineProperty(MockHTMLVideoElement.prototype, 'requestVideoFrameCallback', {
        value: () => {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, 'HTMLVideoElement', {
        value: MockHTMLVideoElement,
        writable: true,
        configurable: true,
      });
      // Mock document and canvas with WebGL2
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue({}),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);
      const caps = detectCapabilities();

      expect(caps.offscreenCanvas).toBe(true);
      expect(caps.worker).toBe(true);
      expect(caps.webgl2).toBe(true);
      expect(caps.requestVideoFrameCallback).toBe(true);
    });

    it('detects no capabilities when none are available', () => {
      // No globals set - all should be false
      const caps = detectCapabilities();

      expect(caps.offscreenCanvas).toBe(false);
      expect(caps.worker).toBe(false);
      expect(caps.webgl2).toBe(false);
      expect(caps.requestVideoFrameCallback).toBe(false);
    });

    it('detects OffscreenCanvas when available', () => {
      Object.defineProperty(global, 'OffscreenCanvas', {
        value: class {},
        writable: true,
        configurable: true,
      });

      const caps = detectCapabilities();

      expect(caps.offscreenCanvas).toBe(true);
      expect(caps.worker).toBe(false);
      expect(caps.webgl2).toBe(false);
      expect(caps.requestVideoFrameCallback).toBe(false);
    });

    it('detects Worker when available', () => {
      Object.defineProperty(global, 'Worker', {
        value: class {},
        writable: true,
        configurable: true,
      });

      const caps = detectCapabilities();

      expect(caps.offscreenCanvas).toBe(false);
      expect(caps.worker).toBe(true);
      expect(caps.webgl2).toBe(false);
      expect(caps.requestVideoFrameCallback).toBe(false);
    });

    it('detects WebGL2 when available', () => {
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue({}),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      const caps = detectCapabilities();

      expect(caps.offscreenCanvas).toBe(false);
      expect(caps.worker).toBe(false);
      expect(caps.webgl2).toBe(true);
      expect(caps.requestVideoFrameCallback).toBe(false);
    });

    it('detects WebGL2 as false when document.createElement returns canvas without webgl2 context', () => {
      // Test the case where document exists but getContext('webgl2') returns null
      // This simulates the behavior when document is undefined (webgl2 check returns false)
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(null),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      const caps = detectCapabilities();

      expect(caps.webgl2).toBe(false);
    });

    it('detects WebGL2 as false when getContext returns null', () => {
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(null),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      const caps = detectCapabilities();

      expect(caps.webgl2).toBe(false);
    });

    it('detects requestVideoFrameCallback when available', () => {
      class MockHTMLVideoElement {}
      Object.defineProperty(MockHTMLVideoElement.prototype, 'requestVideoFrameCallback', {
        value: () => {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, 'HTMLVideoElement', {
        value: MockHTMLVideoElement,
        writable: true,
        configurable: true,
      });

      const caps = detectCapabilities();

      expect(caps.offscreenCanvas).toBe(false);
      expect(caps.worker).toBe(false);
      expect(caps.webgl2).toBe(false);
      expect(caps.requestVideoFrameCallback).toBe(true);
    });

    it('detects requestVideoFrameCallback as false when HTMLVideoElement is undefined', () => {
      // HTMLVideoElement is undefined
      const caps = detectCapabilities();

      expect(caps.requestVideoFrameCallback).toBe(false);
    });

    it('detects requestVideoFrameCallback as false when method not in prototype', () => {
      class MockHTMLVideoElement {}
      // Don't add requestVideoFrameCallback to prototype
      Object.defineProperty(global, 'HTMLVideoElement', {
        value: MockHTMLVideoElement,
        writable: true,
        configurable: true,
      });

      const caps = detectCapabilities();

      expect(caps.requestVideoFrameCallback).toBe(false);
    });

    it('handles partial capabilities correctly', () => {
      // Only OffscreenCanvas and Worker, but no WebGL2
      Object.defineProperty(global, 'OffscreenCanvas', {
        value: class {},
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, 'Worker', {
        value: class {},
        writable: true,
        configurable: true,
      });
      const mockCanvas = {
        getContext: jest.fn().mockReturnValue(null), // WebGL2 not available
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

      const caps = detectCapabilities();

      expect(caps.offscreenCanvas).toBe(true);
      expect(caps.worker).toBe(true);
      expect(caps.webgl2).toBe(false);
      expect(caps.requestVideoFrameCallback).toBe(false);
    });
  });

  describe('choosePipeline', () => {
    it('selects worker-webgl2 when all capabilities available and preferWorker=true', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: true,
        worker: true,
        webgl2: true,
        requestVideoFrameCallback: true,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('worker-webgl2');
    });

    it('selects main-webgl2 when all capabilities available but preferWorker=false', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: true,
        worker: true,
        webgl2: true,
        requestVideoFrameCallback: true,
      };

      const pipeline = choosePipeline(caps, false);

      expect(pipeline).toBe('main-webgl2');
    });

    it('selects main-webgl2 when webgl2 available but worker missing', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: true,
        worker: false,
        webgl2: true,
        requestVideoFrameCallback: true,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('main-webgl2');
    });

    it('selects main-webgl2 when webgl2 available but offscreenCanvas missing', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: false,
        worker: true,
        webgl2: true,
        requestVideoFrameCallback: true,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('main-webgl2');
    });

    it('selects main-webgl2 when only webgl2 is available', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: false,
        worker: false,
        webgl2: true,
        requestVideoFrameCallback: false,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('main-webgl2');
    });

    it('selects canvas2d when webgl2 unavailable but document exists', () => {
      // document exists (jsdom provides it), so canvas2d should be selected
      const caps: CapabilityInfo = {
        offscreenCanvas: false,
        worker: false,
        webgl2: false,
        requestVideoFrameCallback: false,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('canvas2d');
    });

    it('selects passthrough when no capabilities and no document', () => {
      const previousDescriptor = Object.getOwnPropertyDescriptor(global, 'document');
      Object.defineProperty(global, 'document', {value: undefined, configurable: true});
      try {
        const caps: CapabilityInfo = {
          offscreenCanvas: false,
          worker: false,
          webgl2: false,
          requestVideoFrameCallback: false,
        };

        const pipeline = choosePipeline(caps, true);

        expect(pipeline).toBe('passthrough');
      } finally {
        if (previousDescriptor) {
          Object.defineProperty(global, 'document', previousDescriptor);
        } else {
          delete (global as any).document;
        }
      }
    });

    it('selects canvas2d when no webgl2 but document exists (jsdom environment)', () => {
      // In jsdom, document exists, so canvas2d is selected
      const caps: CapabilityInfo = {
        offscreenCanvas: false,
        worker: false,
        webgl2: false,
        requestVideoFrameCallback: false,
      };

      const pipeline = choosePipeline(caps, true);

      // In jsdom environment, document exists so canvas2d is returned
      // In real worker environment (document undefined), passthrough would be returned
      expect(pipeline).toBe('canvas2d');
    });

    it('prioritizes worker-webgl2 over main-webgl2 when both possible', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: true,
        worker: true,
        webgl2: true,
        requestVideoFrameCallback: true,
      };

      const workerPipeline = choosePipeline(caps, true);
      const mainPipeline = choosePipeline(caps, false);

      expect(workerPipeline).toBe('worker-webgl2');
      expect(mainPipeline).toBe('main-webgl2');
    });

    it('prioritizes main-webgl2 over canvas2d when webgl2 available', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: false,
        worker: false,
        webgl2: true,
        requestVideoFrameCallback: false,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('main-webgl2');
    });

    it('prioritizes canvas2d over passthrough when document available', () => {
      // document exists (jsdom provides it)
      const caps: CapabilityInfo = {
        offscreenCanvas: false,
        worker: false,
        webgl2: false,
        requestVideoFrameCallback: false,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('canvas2d');
    });

    it('handles edge case: webgl2 true but preferWorker false with all other capabilities', () => {
      const caps: CapabilityInfo = {
        offscreenCanvas: true,
        worker: true,
        webgl2: true,
        requestVideoFrameCallback: true,
      };

      const pipeline = choosePipeline(caps, false);

      expect(pipeline).toBe('main-webgl2');
    });

    it('handles edge case: only requestVideoFrameCallback available', () => {
      // document exists (jsdom provides it)
      const caps: CapabilityInfo = {
        offscreenCanvas: false,
        worker: false,
        webgl2: false,
        requestVideoFrameCallback: true,
      };

      const pipeline = choosePipeline(caps, true);

      expect(pipeline).toBe('canvas2d');
    });
  });
});
