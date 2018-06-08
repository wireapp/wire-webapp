export type SerializedCryptobox = {
  identity: string;
  prekeys: {[preKeyId: string]: string};
  sessions: {[sessionId: string]: string};
};
