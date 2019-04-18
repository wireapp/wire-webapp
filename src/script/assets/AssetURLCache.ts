import {LRUCache} from '@wireapp/lru-cache';

class AssetURLCache {
  private cache: LRUCache<string> = new LRUCache(100);

  getUrl(identifier: string): string {
    return this.cache.get(identifier);
  }

  setUrl(identifier: string, url: string): string {
    const isExistingUrl = this.getUrl(identifier);

    if (isExistingUrl) {
      window.URL.revokeObjectURL(url);
      return isExistingUrl;
    }

    const outdatedUrl = this.cache.set(identifier, url);

    if (outdatedUrl != null) {
      window.URL.revokeObjectURL(outdatedUrl);
    }

    return url;
  }
}

export default AssetURLCache;
