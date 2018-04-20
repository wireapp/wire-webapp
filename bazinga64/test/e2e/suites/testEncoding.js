module.exports = {
  'Encode value': browser => {
    browser.click("//*[@data-test-name='button-encode']");
  },
  'Input value': browser => {
    browser.url(browser.launch_url).setValue("//*[@data-test-name='input-decoded']", browser.globals.decoded);
  },
  'Validate encoded value': browser => {
    browser.assert.value("//*[@data-test-name='input-encoded']", browser.globals.encoded);
  },
};
