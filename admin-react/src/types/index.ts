// Base interface that satisfies TableData constraint
interface BaseTableData {
    [key: string]: unknown;
}

// User 
export interface Users extends BaseTableData {

}

export interface Realms extends BaseTableData {

}

export interface Apps extends BaseTableData {

}

// Common utility types
export type StatusType = 'case' | 'warden' | 'eht' | 'location';
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

// Table data constraint type
export type TableData = Record<string, unknown>;