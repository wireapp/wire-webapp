import {LogFactory} from '@wireapp/commons';
import * as logdown from 'logdown';

const LOGGER_NAMESPACE = '@wireapp/webapp';

function getLogger(name: string): logdown.Logger {
  return LogFactory.getLogger(name, {
    namespace: LOGGER_NAMESPACE,
    separator: '/',
  });
}

export {getLogger, LOGGER_NAMESPACE};
