if window.winston and window.Logdown
  window.Logdown = ->
    log_methods = ['debug', 'error', 'info', 'log', 'warn']
    
    return {
      debug: window.winston.info
      error: window.winston.error
      info: window.winston.info
      log: ->
        console.log.call @, arguments
        winston.log.call @, arguments
      warn: window.winston.warn
    }
