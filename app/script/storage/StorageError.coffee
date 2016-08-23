window.z ?= {}
z.storage ?= {}

class z.storage.StorageError
  constructor: (@message = 'Unknown storage error') ->
    @name = @constructor.name
    @stack = (new Error()).stack

  @:: = new Error()
  @::constructor = @
  @::INVALID_TIMESTAMP = 'Invalid timestamp'
