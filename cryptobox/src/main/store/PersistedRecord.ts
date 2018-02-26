interface PersistedRecord {
  created: number;
  id: string;
  serialised: ArrayBuffer | string; // For backward compatibility "serialised" can be an ArrayBuffer or Base64-encoded String.
  version: string;
}

export default PersistedRecord;
