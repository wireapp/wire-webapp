import {LogFactory} from '@wireapp/commons';
import {Logger} from 'logdown';

const LOGGER_NAMESPACE = '@wireapp/webapp';

function getLogger(name: string): Logger {
  return LogFactory.getLogger(name, {
    namespace: LOGGER_NAMESPACE,
    separator: '/',
  });
}

export {getLogger, LOGGER_NAMESPACE, Logger};
