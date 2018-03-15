import {
  ClientClassification,
  ClientType,
  Location,
  NewClient,
  RegisteredClient,
} from '@wireapp/api-client/dist/commonjs/client/index';

interface ClientInfo {
  classification: ClientClassification;
  cookieLabel: string;
  model: string;
  location?: Location;
}

export {ClientInfo};
