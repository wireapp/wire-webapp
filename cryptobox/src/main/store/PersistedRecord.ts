interface PersistedRecord {
  created: number;
  id: string;
  serialised: string;
  version: string;
}

export default PersistedRecord;
