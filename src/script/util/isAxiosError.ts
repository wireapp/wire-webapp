import {AxiosError} from 'axios';

export function isAxiosError(errorCandidate: any): errorCandidate is AxiosError {
  return errorCandidate.isAxiosError === true;
}
