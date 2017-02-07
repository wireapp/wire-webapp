if window.winston and window.Logdown
  window.Logdown = -> return {
    debug: window.winston.info
    error: window.winston.error
    info: window.winston.info
    log: window.winston.info
    warn: window.winston.warn
  }
