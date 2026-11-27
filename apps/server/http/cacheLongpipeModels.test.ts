import type {Request, Response} from 'express';

import {cacheLongpipeModels} from './cacheLongpipeModels';

describe('cacheLongpipeModels', () => {
  it.each(['model_small.f16.bin', 'model_xs.bin', 'model_medium.bin', 'model_large.f16.bin'])(
    'caches versioned weights %s instead of applying the default policy',
    file => {
      const fallback = jest.fn();
      const setHeader = jest.fn();
      const next = jest.fn();
      cacheLongpipeModels(fallback)(
        {path: `/assets/longpipe/models/v0.0.5/${file}`} as Request,
        {setHeader} as unknown as Response,
        next,
      );
      expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
      expect(fallback).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['/config.js', '/assets/longpipe/models/model_small.bin', '/assets/other.bin'])(
    'preserves the default cache policy for %s',
    path => {
      const fallback = jest.fn();
      const request = {path} as Request;
      const response = {} as Response;
      const next = jest.fn();
      cacheLongpipeModels(fallback)(request, response, next);
      expect(fallback).toHaveBeenCalledWith(request, response, next);
    },
  );
});
