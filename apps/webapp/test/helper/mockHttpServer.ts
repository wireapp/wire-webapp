type HeaderMap = Record<string, string>;
type RouteMatcher = RegExp | string;
type StaticResponse = [number, HeaderMap, string];
type DynamicResponseHandler = (request: MockXMLHttpRequest, ...captures: string[]) => void;
type RouteResponse = DynamicResponseHandler | StaticResponse;

interface RegisteredRoute {
  readonly method: string;
  readonly matcher: RouteMatcher;
  readonly response: RouteResponse;
}

type Listener = (event: ProgressEvent<XMLHttpRequest>) => void;

const normalizeMethod = (httpMethod: string): string => {
  return httpMethod.toUpperCase();
};

const createHeaderMap = (headers: HeaderMap = {}): HeaderMap => {
  const normalizedHeaders = Object.entries(headers).reduce<HeaderMap>((accumulator, [headerName, headerValue]) => {
    accumulator[headerName.toLowerCase()] = headerValue;
    return accumulator;
  }, {});

  return normalizedHeaders;
};

const toResponseText = (responseBody: string | ArrayBuffer | null): string => {
  if (typeof responseBody === 'string') {
    return responseBody;
  }

  if (responseBody instanceof ArrayBuffer) {
    return new TextDecoder().decode(responseBody);
  }

  return '';
};

const toResponseBody = (
  responseBody: string,
  responseType: XMLHttpRequestResponseType,
): ArrayBuffer | object | string => {
  if (responseType === 'arraybuffer') {
    return new TextEncoder().encode(responseBody).buffer;
  }

  if (responseType === 'json') {
    return responseBody ? JSON.parse(responseBody) : null;
  }

  return responseBody;
};

const buildProgressEvent = (request: MockXMLHttpRequest, eventType: string): ProgressEvent<XMLHttpRequest> => {
  return {
    lengthComputable: false,
    loaded: 0,
    target: request as unknown as XMLHttpRequest,
    total: 0,
    type: eventType,
  } as ProgressEvent<XMLHttpRequest>;
};

const matcherCaptures = (matcher: RouteMatcher, requestUrl: string): string[] | null => {
  if (typeof matcher === 'string') {
    return matcher === requestUrl ? [] : null;
  }

  const match = requestUrl.match(matcher);
  return match ? match.slice(1) : null;
};

class MockXMLHttpRequest implements XMLHttpRequest {
  static readonly UNSENT = 0;
  static readonly OPENED = 1;
  static readonly HEADERS_RECEIVED = 2;
  static readonly LOADING = 3;
  static readonly DONE = 4;

  static routes: RegisteredRoute[] = [];
  static autoRespond = false;

  readonly UNSENT = MockXMLHttpRequest.UNSENT;
  readonly OPENED = MockXMLHttpRequest.OPENED;
  readonly HEADERS_RECEIVED = MockXMLHttpRequest.HEADERS_RECEIVED;
  readonly LOADING = MockXMLHttpRequest.LOADING;
  readonly DONE = MockXMLHttpRequest.DONE;

  onabort: ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null = null;
  onerror: ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null = null;
  onload: ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null = null;
  onloadend: ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null = null;
  onloadstart: ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null = null;
  onprogress: ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null = null;
  onreadystatechange: ((this: XMLHttpRequest, event: Event) => void) | null = null;
  ontimeout: ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null = null;

  readyState = MockXMLHttpRequest.UNSENT;
  response: any = '';
  responseText = '';
  responseType: XMLHttpRequestResponseType = '';
  responseURL = '';
  responseXML: Document | null = null;
  status = 0;
  statusText = '';
  timeout = 0;
  upload = {} as XMLHttpRequestUpload;
  withCredentials = false;

  private requestHeaders: HeaderMap = {};
  private responseHeaders: HeaderMap = {};
  private listeners = new Map<string, Set<Listener>>();
  private requestMethod = 'GET';
  private requestUrl = '';

  abort(): void {
    this.readyState = MockXMLHttpRequest.DONE;
    this.dispatch('abort');
    this.dispatch('loadend');
  }

  addEventListener(type: string, listener: Listener | EventListener): void {
    const callback = listener as Listener;
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(): boolean {
    return true;
  }

  getAllResponseHeaders(): string {
    return Object.entries(this.responseHeaders)
      .map(([headerName, headerValue]) => {
        return `${headerName}: ${headerValue}`;
      })
      .join('\r\n');
  }

  getResponseHeader(headerName: string): string | null {
    return this.responseHeaders[headerName.toLowerCase()] ?? null;
  }

  open(method: string, url: string): void {
    this.requestMethod = normalizeMethod(method);
    this.requestUrl = url;
    this.responseURL = url;
    this.readyState = MockXMLHttpRequest.OPENED;
    this.dispatchReadyStateChange();
  }

  overrideMimeType(): void {}

  removeEventListener(type: string, listener: Listener | EventListener): void {
    const callback = listener as Listener;
    const listeners = this.listeners.get(type);
    listeners?.delete(callback);
  }

  respond(status: number, headers: HeaderMap = {}, body = ''): void {
    this.status = status;
    this.statusText = `${status}`;
    this.responseHeaders = createHeaderMap(headers);
    this.readyState = MockXMLHttpRequest.HEADERS_RECEIVED;
    this.dispatchReadyStateChange();
    this.readyState = MockXMLHttpRequest.LOADING;
    this.dispatchReadyStateChange();
    this.readyState = MockXMLHttpRequest.DONE;
    this.responseText = toResponseText(body);
    this.response = toResponseBody(this.responseText, this.responseType);
    this.dispatchReadyStateChange();
    this.dispatch('load');
    this.dispatch('loadend');
  }

  send(): void {
    const matchingRoute = MockXMLHttpRequest.routes.find(route => {
      return route.method === this.requestMethod && matcherCaptures(route.matcher, this.requestUrl) !== null;
    });

    if (!matchingRoute) {
      this.respond(404, {}, '');
      return;
    }

    const captures = matcherCaptures(matchingRoute.matcher, this.requestUrl) ?? [];
    const answerRequest = (): void => {
      if (typeof matchingRoute.response === 'function') {
        matchingRoute.response(this, ...captures);
        return;
      }

      const [status, headers, body] = matchingRoute.response;
      this.respond(status, headers, body);
    };

    if (MockXMLHttpRequest.autoRespond) {
      window.setTimeout(() => {
        answerRequest();
      }, 0);
      return;
    }

    answerRequest();
  }

  setRequestHeader(headerName: string, headerValue: string): void {
    this.requestHeaders[headerName.toLowerCase()] = headerValue;
  }

  private dispatch(eventType: string): void {
    const event = buildProgressEvent(this, eventType);
    const listeners = this.listeners.get(eventType);

    listeners?.forEach(listener => {
      listener(event);
    });

    const handler = this.getEventHandler(eventType);
    handler?.call(this as unknown as XMLHttpRequest, event as unknown as ProgressEvent<XMLHttpRequestEventTarget>);
  }

  private dispatchReadyStateChange(): void {
    this.onreadystatechange?.call(this as unknown as XMLHttpRequest, new Event('readystatechange'));
    const listeners = this.listeners.get('readystatechange');
    if (!listeners) {
      return;
    }

    const event = buildProgressEvent(this, 'readystatechange');
    listeners.forEach(listener => {
      listener(event);
    });
  }

  private getEventHandler(
    eventType: string,
  ): ((this: XMLHttpRequest, event: ProgressEvent<XMLHttpRequestEventTarget>) => void) | null {
    switch (eventType) {
      case 'abort':
        return this.onabort;
      case 'error':
        return this.onerror;
      case 'load':
        return this.onload;
      case 'loadend':
        return this.onloadend;
      case 'loadstart':
        return this.onloadstart;
      case 'progress':
        return this.onprogress;
      case 'timeout':
        return this.ontimeout;
      default:
        return null;
    }
  }
}

export interface MockHttpServer {
  autoRespond: boolean;
  respondWith(method: string, matcher: RouteMatcher, response: RouteResponse): void;
  restore(): void;
}

export const createMockHttpServer = (): MockHttpServer => {
  const originalXmlHttpRequest = window.XMLHttpRequest;
  MockXMLHttpRequest.routes = [];
  MockXMLHttpRequest.autoRespond = false;
  window.XMLHttpRequest = MockXMLHttpRequest as unknown as typeof XMLHttpRequest;

  return {
    get autoRespond(): boolean {
      return MockXMLHttpRequest.autoRespond;
    },
    set autoRespond(shouldAutoRespond: boolean) {
      MockXMLHttpRequest.autoRespond = shouldAutoRespond;
    },
    respondWith(method: string, matcher: RouteMatcher, response: RouteResponse): void {
      MockXMLHttpRequest.routes.push({
        matcher,
        method: normalizeMethod(method),
        response,
      });
    },
    restore(): void {
      MockXMLHttpRequest.routes = [];
      MockXMLHttpRequest.autoRespond = false;
      window.XMLHttpRequest = originalXmlHttpRequest;
    },
  };
};
