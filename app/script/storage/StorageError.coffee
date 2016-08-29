window.z ?= {}
z.storage ?= {}

class z.storage.StorageError
  constructor: (message) ->
    @name = @constructor.name
    @message = message or @::TYPE.UNKNOWN
    @stack = (new Error()).stack

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    FAILED_TO_OPEN: 'Failed to open database'
    INVALID_TIMESTAMP: 'Invalid timestamp'
    UNKNOWN: 'Unknown storage error'
  }
