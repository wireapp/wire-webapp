import {LinkProviderContribution} from '../types';

let _providers: LinkProviderContribution[] = [];

export const registerLinkProviders = (providers: LinkProviderContribution[]): void => {
    _providers = providers;
};

export const getLinkProviders = (): LinkProviderContribution[] => _providers;
