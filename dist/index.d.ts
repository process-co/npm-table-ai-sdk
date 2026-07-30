import { TableClient } from '@process.co/table-client';
import { ToolSet } from 'ai';

declare const PROCESS_TABLE_TOOL_LIMITS: {
    readonly defaultMaxQueryRows: 50;
    readonly hardMaxQueryRows: 200;
    readonly defaultMaxInputBytes: number;
    readonly hardMaxInputBytes: number;
    readonly defaultMaxResultBytes: number;
    readonly hardMaxResultBytes: number;
};
declare const PROCESS_TABLE_READ_TOOL_NAMES: readonly ["listProcessDatasets", "inspectProcessDataset", "queryProcessRows", "getProcessRow"];
declare const PROCESS_TABLE_MUTATION_TOOL_NAMES: readonly ["insertProcessRow", "updateProcessRow", "deleteProcessRow"];
type ProcessTableToolClient = Pick<TableClient, 'listDatasets' | 'getDataset' | 'getLayout' | 'queryRows' | 'getRow' | 'insertRow' | 'patchRow' | 'deleteRow'>;
type ProcessTableToolsOptions = {
    client: ProcessTableToolClient;
    limits?: {
        maxQueryRows?: number;
        maxInputBytes?: number;
        maxResultBytes?: number;
    };
    mutations?: {
        enabled: true;
    };
};
declare function createProcessTableTools(options: ProcessTableToolsOptions): ToolSet;

declare class ProcessTableToolError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly requestId: string;
    constructor(input: {
        code: string;
        statusCode: number;
        requestId: string;
    });
    toJSON(): {
        code: string;
        statusCode: number;
        requestId: string;
    };
}
declare function toProcessTableToolError(error: unknown): ProcessTableToolError;

export { PROCESS_TABLE_MUTATION_TOOL_NAMES, PROCESS_TABLE_READ_TOOL_NAMES, PROCESS_TABLE_TOOL_LIMITS, type ProcessTableToolClient, ProcessTableToolError, type ProcessTableToolsOptions, createProcessTableTools, toProcessTableToolError };
