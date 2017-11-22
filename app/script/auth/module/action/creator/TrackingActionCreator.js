export const TRACKING_ACTION_START = 'TRACKING_ACTION_START';
export const TRACKING_ACTION_SUCCESS = 'TRACKING_ACTION_SUCCESS';
export const TRACKING_ACTION_FAILED = 'TRACKING_ACTION_FAILED';

export function startTrackingAction(params) {
  return {params, type: TRACKING_ACTION_START};
}

export function successfulTrackingAction(trackingResult) {
  return {payload: trackingResult, type: TRACKING_ACTION_SUCCESS};
}

export function failedTrackingAction(error) {
  return {payload: error, type: TRACKING_ACTION_FAILED};
}
