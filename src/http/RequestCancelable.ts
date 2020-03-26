import {AxiosResponse, Canceler} from 'axios';

export interface RequestCancelable<T> {
  response: Promise<AxiosResponse<T>>;
  cancel: Canceler;
}
