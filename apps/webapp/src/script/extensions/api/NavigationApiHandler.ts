import {navigate} from 'src/script/router/Router';
import {generateExtensionUrl} from 'src/script/router/routeGenerator';

export class NavigationApiHandler {
    async handle(method: string, params: unknown): Promise<unknown> {
        switch (method) {
            case 'navigation.goTo': {
                const {path} = params as {path: string};
                navigate(path);
                return null;
            }

            case 'navigation.goToPlugin': {
                const {extensionId, path = '/'} = params as {extensionId: string; path?: string};
                navigate(generateExtensionUrl(extensionId, path));
                return null;
            }

            case 'navigation.getCurrentPath':
                return window.location.hash.replace('#', '') || '/';

            default:
                throw Object.assign(new Error(`Not implemented: ${method}`), {code: 'NOT_IMPLEMENTED'});
        }
    }
}
