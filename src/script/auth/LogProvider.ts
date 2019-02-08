import {LogFactory} from '@wireapp/commons';
import * as logdown from 'logdown';

function getLogger(name: string): logdown.Logger {
  return LogFactory.getLogger(name, {
    namespace: '@wireapp/webapp',
    separator: '/',
  });
}

export {getLogger};
