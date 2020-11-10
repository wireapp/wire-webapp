// @see https://www.w3.org/TR/trace-context/#tracestate-header
export type TraceState = {
  /** https://www.w3.org/TR/trace-context/#value */
  position: string;
  /** https://www.w3.org/TR/trace-context/#key */
  vendor: string;
};
