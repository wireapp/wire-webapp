import {ExtensionManifest} from '../types';

/**
 * Check whether an extension with the given manifest is allowed to call the given RPC method.
 * Returns true if allowed, throws an error with code PERMISSION_DENIED if not.
 */
export const checkPermission = (
    manifest: ExtensionManifest | undefined,
    method: string,
    params?: unknown,
): void => {
    if (!manifest) {
        throw Object.assign(new Error('Extension not found'), {code: 'NOT_FOUND'});
    }

    const permissions = manifest.contributes?.permissions ?? [];

    const hasPermission = (required: string): boolean => permissions.includes(required);

    const deny = (reason: string): never => {
        throw Object.assign(new Error(reason), {code: 'PERMISSION_DENIED'});
    };

    if (method.startsWith('storage.')) {
        // Storage is always allowed for own namespace — enforced by table name check in StorageManager
        return;
    }

    if (method.startsWith('conversations.') || method.startsWith('events.')) {
        if (!hasPermission('conversations:read')) {
            deny(`${method} requires conversations:read permission`);
        }
        return;
    }

    if (method.startsWith('llm.')) {
        if (!hasPermission('llm:call')) {
            deny(`${method} requires llm:call permission`);
        }
        return;
    }

    if (method.startsWith('http.')) {
        const url = (params as {url?: string})?.url ?? '';
        const allowed = permissions.some(p => {
            if (!p.startsWith('http:')) return false;
            const pattern = p.slice(5); // Remove "http:" prefix
            if (pattern === '*') return true;
            try {
                const urlObj = new URL(url);
                // Simple glob matching: https://*.atlassian.net/*
                const regexStr = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '[^/]*');
                return new RegExp(`^${regexStr}$`).test(`${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`);
            } catch {
                return false;
            }
        });
        if (!allowed) {
            deny(`http request to ${url} not in allowed origins`);
        }
        return;
    }

    if (method === 'navigation.goToPlugin') {
        if (!hasPermission('navigate:cross-plugin')) {
            deny('navigation.goToPlugin requires navigate:cross-plugin permission');
        }
        return;
    }

    // Default: allow settings, navigation.goTo, notifications, commands, datasets, router, lifecycle
};
