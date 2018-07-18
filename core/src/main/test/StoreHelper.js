const {MemoryEngine} = require('@wireapp/store-engine');

module.exports = {
  createMemoryEngine: async (storeName = `temp-${Date.now()}`) => {
    const engine = new MemoryEngine();
    await engine.init(storeName);
    return engine;
  },
};
