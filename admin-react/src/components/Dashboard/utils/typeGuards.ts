import type { DataItem, TabType } from '../../../types';

export const isValidTab = (tab: string): tab is TabType => {
    return ['cases', 'lifesg-cases', 'cpg-cases', 'wardens', 'locations', 'eht', 'ura-nopo', 'ura-upl', 'hdb'].includes(tab);
};

export const getItemType = (item: DataItem): string => {
    if ('status' in item && 'priority' in item) return 'case';
    if ('badge' in item) return 'warden';
    if ('coordinates' in item) return 'location';
    if ('patientId' in item) return 'EHT record';
    if ('nopoNo' in item) return 'parking offense';
    if ('uuid' in item) return 'resubmit issue';
    return 'item';
};