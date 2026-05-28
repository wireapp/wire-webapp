import {ExtensionManifest} from '../types';

const HOST_API_VERSION = '1.0.0';

// Parses a semver string into [major, minor, patch] tuple, returns null if unparseable.
const parseSemver = (version: string): [number, number, number] | null => {
    const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!match) {
        return null;
    }
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3] ?? '0', 10)];
};

// Compares two [major, minor, patch] tuples. Returns negative if a < b, 0 if equal, positive if a > b.
const compareSemver = (a: [number, number, number], b: [number, number, number]): number => {
    for (let index = 0; index < 3; index++) {
        if (a[index] !== b[index]) {
            return a[index] - b[index];
        }
    }
    return 0;
};

/**
 * Checks whether the host's version satisfies the extension's required version range.
 *
 * Supported formats:
 *   ^x.y / ^x.y.z  — major must match, minor+patch >= range minimum
 *   ~x.y / ~x.y.z  — major+minor must match, patch >= range minimum
 *   >=x.y.z        — host version must be >= specified version
 *   x.y.z          — exact match
 */
export const isVersionCompatible = (range: string, hostVersion: string): boolean => {
    const host = parseSemver(hostVersion);
    if (!host) {
        return false;
    }

    if (range.startsWith('^')) {
        const min = parseSemver(range.slice(1));
        if (!min) {
            return false;
        }
        // Major must match; host minor.patch must be >= range minor.patch.
        return host[0] === min[0] && compareSemver(host, min) >= 0;
    }

    if (range.startsWith('~')) {
        const min = parseSemver(range.slice(1));
        if (!min) {
            return false;
        }
        // Major and minor must match; host patch must be >= range patch.
        return host[0] === min[0] && host[1] === min[1] && host[2] >= min[2];
    }

    if (range.startsWith('>=')) {
        const min = parseSemver(range.slice(2));
        if (!min) {
            return false;
        }
        return compareSemver(host, min) >= 0;
    }

    // Exact match.
    const exact = parseSemver(range);
    if (!exact) {
        return false;
    }
    return compareSemver(host, exact) === 0;
};

const ALLOWED_PERMISSIONS = [
    'storage:*',
    'conversations:read',
    'conversations:read:text',
    'events:watch',
    'llm:call',
    'navigate:cross-plugin',
    // http: patterns are validated separately
];

const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-z0-9.]+)?(\+[a-z0-9.]+)?$/i;
const EXTENSION_ID_RE = /^[a-z0-9]+(\.[a-z0-9]+)+$/;

export interface ValidationError {
    field: string;
    message: string;
}

export const validateManifest = (
    raw: unknown,
): {valid: boolean; errors: ValidationError[]; manifest?: ExtensionManifest} => {
    const errors: ValidationError[] = [];

    if (typeof raw !== 'object' || raw === null) {
        return {valid: false, errors: [{field: 'root', message: 'Manifest must be an object'}]};
    }

    const m = raw as Record<string, unknown>;

    if (typeof m.id !== 'string' || !EXTENSION_ID_RE.test(m.id)) {
        errors.push({field: 'id', message: 'id must match /^[a-z0-9]+(\\.[a-z0-9]+)+$/'});
    }

    if (typeof m.name !== 'string' || m.name.length === 0) {
        errors.push({field: 'name', message: 'name is required'});
    }

    if (typeof m.version !== 'string' || !SEMVER_RE.test(m.version)) {
        errors.push({field: 'version', message: 'version must be semver (x.y.z)'});
    }

    if (typeof m.wireApiVersion !== 'string') {
        errors.push({field: 'wireApiVersion', message: 'wireApiVersion is required'});
    } else if (!isVersionCompatible(m.wireApiVersion, HOST_API_VERSION)) {
        errors.push({
            field: 'wireApiVersion',
            message: `wireApiVersion "${m.wireApiVersion}" is not compatible with host API version ${HOST_API_VERSION}`,
        });
    }

    // Validate permissions
    const permissions = (m.contributes as Record<string, unknown>)?.permissions as unknown;
    if (Array.isArray(permissions)) {
        for (const perm of permissions) {
            if (typeof perm !== 'string') {
                errors.push({field: 'permissions', message: `Permission must be a string: ${perm}`});
                continue;
            }
            const allowed =
                perm.startsWith('http:') ||
                perm.startsWith('storage:') ||
                ALLOWED_PERMISSIONS.includes(perm);
            if (!allowed) {
                errors.push({field: 'permissions', message: `Unknown permission: ${perm}`});
            }
        }
    }

    // Validate routes start with /plugins/{id}
    const contributes = m.contributes as Record<string, unknown> | undefined;
    const routes = contributes?.routes as unknown;
    if (Array.isArray(routes) && typeof m.id === 'string') {
        for (const route of routes) {
            const r = route as Record<string, unknown>;
            if (typeof r.path === 'string' && !r.path.startsWith(`/plugins/${m.id}`)) {
                errors.push({
                    field: 'contributes.routes',
                    message: `Route path must start with /plugins/${m.id}: ${r.path}`,
                });
            }
        }
    }

    if (errors.length > 0) {
        return {valid: false, errors};
    }

    return {valid: true, errors: [], manifest: m as unknown as ExtensionManifest};
};
