import {ConversationSettingContribution} from '../types';

interface RegistryEntry {
    extensionId: string;
    contribution: ConversationSettingContribution;
}

let _settings: RegistryEntry[] = [];

export const registerConversationSettings = (
    extensionId: string,
    contributions: ConversationSettingContribution[],
): void => {
    _settings = _settings.filter(s => s.extensionId !== extensionId);
    for (const contribution of contributions) {
        _settings.push({extensionId, contribution});
    }
};

export const getConversationSettings = (): RegistryEntry[] => _settings;
