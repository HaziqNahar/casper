export const formatDateTime = (timestamp: number): string => {
    const str = String(timestamp);
    if (str.length !== 14) return str;
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)} ${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14)}`;
};