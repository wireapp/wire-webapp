const Mixpanel = require('mixpanel-browser');
import {MIXPANEL_TOKEN} from './config';

export const configureTracking = () => {
  const mixpanel = Mixpanel.init(MIXPANEL_TOKEN);
  return mixpanel;
};

export default configureTracking;
