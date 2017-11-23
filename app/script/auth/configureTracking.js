import mixpanel from 'mixpanel-browser';
import {MIXPANEL_TOKEN} from './config';

export const configureTracking = () => {
  mixpanel.init(MIXPANEL_TOKEN);
  return mixpanel;
};

export default configureTracking;
