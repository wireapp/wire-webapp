# grunt test_init && grunt test_run:storage/StorageRepository

describe 'z.storage.StorageRepository', ->
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeStorageActors().then(done).catch done.fail

  describe 'construct_primary_key', ->
    it 'constructs primary keys', ->
      conversation_id = '35d8767e-83c9-4e9a-a5ee-32ba7de706f2'
      sender_id = '532af01e-1e24-4366-aacf-33b67d4ee376'
      time = '2016-07-09T19:10:55.076Z'

      actual = storage_repository.construct_primary_key conversation_id, sender_id, time
      expected = "#{conversation_id}@#{sender_id}@1468091455076"

      expect(actual).toBe expected

    it 'works with timestamps', ->
      conversation_id = '35d8767e-83c9-4e9a-a5ee-32ba7de706f2'
      sender_id = '532af01e-1e24-4366-aacf-33b67d4ee376'
      timestamp = 1468091455076

      actual = storage_repository.construct_primary_key conversation_id, sender_id, timestamp
      expected = "#{conversation_id}@#{sender_id}@#{timestamp}"

      expect(actual).toBe expected

    it 'throws an error on missing timestamps', ->
      expect ->
        storage_repository.construct_primary_key 'A', 'A'
      .toThrowError z.storage.StorageError::INVALID_TIMESTAMP

    it 'throws an error on invalid timestamps', ->
      expect ->
        storage_repository.construct_primary_key 'A', 'A', 'A'
      .toThrowError z.storage.StorageError::INVALID_TIMESTAMP
