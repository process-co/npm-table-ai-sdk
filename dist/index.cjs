"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  PROCESS_TABLE_MUTATION_TOOL_NAMES: () => PROCESS_TABLE_MUTATION_TOOL_NAMES,
  PROCESS_TABLE_READ_TOOL_NAMES: () => PROCESS_TABLE_READ_TOOL_NAMES,
  PROCESS_TABLE_TOOL_LIMITS: () => PROCESS_TABLE_TOOL_LIMITS,
  ProcessTableToolError: () => ProcessTableToolError,
  createProcessTableTools: () => createProcessTableTools,
  toProcessTableToolError: () => toProcessTableToolError
});
module.exports = __toCommonJS(index_exports);

// src/tools.ts
var import_ai = require("ai");

// src/schemas.ts
var import_zod = require("zod");
var identifier = import_zod.z.string().trim().min(1).max(200);
var listDatasetsInputSchema = import_zod.z.object({}).strict();
var inspectDatasetInputSchema = import_zod.z.object({
  datasetId: identifier.describe("Logical Process dataset id")
}).strict();
var queryFilterConditionSchema = import_zod.z.object({
  field: import_zod.z.string().trim().min(1).max(300),
  operator: import_zod.z.enum([
    "eq",
    "ne",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "in",
    "empty",
    "notEmpty"
  ]),
  value: import_zod.z.unknown().optional()
}).strict();
var queryFilterSchema = import_zod.z.lazy(() => import_zod.z.object({
  conjunction: import_zod.z.enum([
    "and",
    "or"
  ]).optional(),
  conditions: import_zod.z.array(queryFilterConditionSchema).max(20).optional(),
  groups: import_zod.z.array(queryFilterSchema).max(4).optional()
}).strict());
var queryRowsInputSchema = import_zod.z.object({
  datasetId: identifier.describe("Logical Process dataset id"),
  filter: queryFilterSchema.optional(),
  sort: import_zod.z.array(import_zod.z.object({
    field: import_zod.z.string().trim().min(1).max(300),
    direction: import_zod.z.union([
      import_zod.z.literal(1),
      import_zod.z.literal(-1)
    ]),
    nulls: import_zod.z.enum([
      "first",
      "last"
    ])
  }).strict()).max(8).optional(),
  cursor: import_zod.z.string().trim().min(1).max(2e3).optional(),
  limit: import_zod.z.number().int().positive().max(200).optional()
}).strict().superRefine((input, ctx) => {
  if (input.filter && filterDepth(input.filter) > 4) {
    ctx.addIssue({
      code: "custom",
      path: [
        "filter"
      ],
      message: "filter nesting exceeds four levels"
    });
  }
});
var getRowInputSchema = import_zod.z.object({
  datasetId: identifier.describe("Logical Process dataset id"),
  rowId: identifier.describe("Logical row id")
}).strict();
var insertRowInputSchema = import_zod.z.object({
  datasetId: identifier.describe("Logical Process dataset id"),
  groupId: identifier.optional(),
  parentRowId: identifier.optional(),
  value: import_zod.z.string().min(1).max(2e4),
  columns: import_zod.z.record(import_zod.z.string().trim().min(1).max(300), import_zod.z.unknown()).optional()
}).strict();
var updateRowInputSchema = import_zod.z.object({
  datasetId: identifier.describe("Logical Process dataset id"),
  rowId: identifier.describe("Logical row id"),
  value: import_zod.z.string().max(2e4).optional(),
  columns: import_zod.z.record(import_zod.z.string().trim().min(1).max(300), import_zod.z.unknown()).optional(),
  groupId: identifier.optional(),
  rank: import_zod.z.string().trim().min(1).max(500).optional()
}).strict().refine((input) => input.value !== void 0 || input.columns !== void 0 || input.groupId !== void 0 || input.rank !== void 0, {
  message: "row patch must not be empty"
});
var deleteRowInputSchema = getRowInputSchema;
function filterDepth(filter) {
  if (!filter.groups?.length) return 1;
  return 1 + Math.max(...filter.groups.map(filterDepth));
}
__name(filterDepth, "filterDepth");

// src/errors.ts
var import_table_client = require("@process.co/table-client");
var import_zod2 = require("zod");
var ProcessTableToolError = class extends Error {
  static {
    __name(this, "ProcessTableToolError");
  }
  code;
  statusCode;
  requestId;
  constructor(input) {
    super(`Process Table tool failed (${input.code})`);
    this.name = "ProcessTableToolError";
    this.code = input.code;
    this.statusCode = input.statusCode;
    this.requestId = input.requestId;
  }
  toJSON() {
    return {
      code: this.code,
      statusCode: this.statusCode,
      requestId: this.requestId
    };
  }
};
function toProcessTableToolError(error) {
  if (error instanceof ProcessTableToolError) return error;
  if (error instanceof import_zod2.ZodError) {
    return new ProcessTableToolError({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      requestId: ""
    });
  }
  if (error instanceof import_table_client.TableServiceError) {
    return new ProcessTableToolError({
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
  }
  if (isTableServiceErrorLike(error)) {
    return new ProcessTableToolError({
      code: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId
    });
  }
  return new ProcessTableToolError({
    code: "INTERNAL_ERROR",
    statusCode: 500,
    requestId: ""
  });
}
__name(toProcessTableToolError, "toProcessTableToolError");
function isTableServiceErrorLike(error) {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && "statusCode" in error && typeof error.statusCode === "number" && "requestId" in error && typeof error.requestId === "string";
}
__name(isTableServiceErrorLike, "isTableServiceErrorLike");

// src/tools.ts
var PROCESS_TABLE_TOOL_LIMITS = {
  defaultMaxQueryRows: 50,
  hardMaxQueryRows: 200,
  defaultMaxInputBytes: 32 * 1024,
  hardMaxInputBytes: 128 * 1024,
  defaultMaxResultBytes: 256 * 1024,
  hardMaxResultBytes: 1024 * 1024
};
var PROCESS_TABLE_READ_TOOL_NAMES = [
  "listProcessDatasets",
  "inspectProcessDataset",
  "queryProcessRows",
  "getProcessRow"
];
var PROCESS_TABLE_MUTATION_TOOL_NAMES = [
  "insertProcessRow",
  "updateProcessRow",
  "deleteProcessRow"
];
function createProcessTableTools(options) {
  if (!options?.client) {
    throw new TypeError("client is required");
  }
  const limits = resolveLimits(options.limits);
  const reads = {
    listProcessDatasets: (0, import_ai.tool)({
      description: "List logical Process datasets accessible to the current server-side principal.",
      inputSchema: listDatasetsInputSchema,
      execute: /* @__PURE__ */ __name((input) => executeBounded(listDatasetsInputSchema, input, limits, async () => projectDiscovery(await options.client.listDatasets())), "execute")
    }),
    inspectProcessDataset: (0, import_ai.tool)({
      description: "Inspect safe capabilities, schema, groups, and views for one logical Process dataset.",
      inputSchema: inspectDatasetInputSchema,
      execute: /* @__PURE__ */ __name((input) => executeBounded(inspectDatasetInputSchema, input, limits, async (parsed) => {
        const [dataset, layout] = await Promise.all([
          options.client.getDataset(parsed.datasetId),
          options.client.getLayout(parsed.datasetId)
        ]);
        return projectInspection(dataset, layout);
      }), "execute")
    }),
    queryProcessRows: (0, import_ai.tool)({
      description: "Run one bounded filter/sort query against a logical Process dataset.",
      inputSchema: (0, import_ai.zodSchema)(queryRowsInputSchema, {
        useReferences: true
      }),
      execute: /* @__PURE__ */ __name((input) => executeBounded(queryRowsInputSchema, input, limits, async (parsed) => {
        const { datasetId, ...query } = parsed;
        const requestedLimit = query.limit ?? limits.maxQueryRows;
        const response = await options.client.queryRows(datasetId, {
          ...query,
          limit: Math.min(requestedLimit, limits.maxQueryRows)
        });
        return projectQuery(response, limits.maxQueryRows);
      }), "execute")
    }),
    getProcessRow: (0, import_ai.tool)({
      description: "Read one logical Process row and its bounded detail envelope.",
      inputSchema: getRowInputSchema,
      execute: /* @__PURE__ */ __name((input) => executeBounded(getRowInputSchema, input, limits, (parsed) => options.client.getRow(parsed.datasetId, parsed.rowId)), "execute")
    })
  };
  if (!options.mutations?.enabled) return reads;
  return {
    ...reads,
    insertProcessRow: (0, import_ai.tool)({
      description: "Insert one Process row. This mutates data and always requires user approval.",
      inputSchema: insertRowInputSchema,
      needsApproval: true,
      execute: /* @__PURE__ */ __name((input, execution) => executeMutation(insertRowInputSchema, input, limits, async (parsed) => {
        const context = agentMutationContext(execution.toolCallId);
        const { datasetId, ...body } = parsed;
        const row = await options.client.insertRow(datasetId, body, context);
        return mutationResult(context, row);
      }), "execute")
    }),
    updateProcessRow: (0, import_ai.tool)({
      description: "Patch one Process row. This mutates data and always requires user approval.",
      inputSchema: updateRowInputSchema,
      needsApproval: true,
      execute: /* @__PURE__ */ __name((input, execution) => executeMutation(updateRowInputSchema, input, limits, async (parsed) => {
        const context = agentMutationContext(execution.toolCallId);
        const { datasetId, rowId, ...body } = parsed;
        const row = await options.client.patchRow(datasetId, rowId, body, context);
        return mutationResult(context, row);
      }), "execute")
    }),
    deleteProcessRow: (0, import_ai.tool)({
      description: "Delete one Process row. This mutates data and always requires user approval.",
      inputSchema: deleteRowInputSchema,
      needsApproval: true,
      execute: /* @__PURE__ */ __name((input, execution) => executeMutation(deleteRowInputSchema, input, limits, async (parsed) => {
        const context = agentMutationContext(execution.toolCallId);
        const result = await options.client.deleteRow(parsed.datasetId, parsed.rowId, context);
        return mutationResult(context, result);
      }), "execute")
    })
  };
}
__name(createProcessTableTools, "createProcessTableTools");
async function executeBounded(schema, input, limits, execute) {
  try {
    assertByteLimit(input, limits.maxInputBytes, "VALIDATION_ERROR", 400);
    const parsed = schema.parse(input);
    const result = await execute(parsed);
    assertByteLimit(result, limits.maxResultBytes, "RESPONSE_TOO_LARGE", 413);
    return result;
  } catch (error) {
    throw toProcessTableToolError(error);
  }
}
__name(executeBounded, "executeBounded");
async function executeMutation(schema, input, limits, execute) {
  try {
    assertByteLimit(input, limits.maxInputBytes, "VALIDATION_ERROR", 400);
    return await execute(schema.parse(input));
  } catch (error) {
    throw toProcessTableToolError(error);
  }
}
__name(executeMutation, "executeMutation");
function assertByteLimit(value, maxBytes, code, statusCode) {
  let json;
  try {
    json = JSON.stringify(value);
  } catch {
    throw new ProcessTableToolError({
      code: "INVALID_RESPONSE",
      statusCode: 502,
      requestId: ""
    });
  }
  if (new TextEncoder().encode(json).byteLength > maxBytes) {
    throw new ProcessTableToolError({
      code,
      statusCode,
      requestId: ""
    });
  }
}
__name(assertByteLimit, "assertByteLimit");
function projectDiscovery(response) {
  return {
    v: 1,
    datasets: response.datasets.map((dataset) => ({
      datasetId: dataset.datasetId,
      name: dataset.name,
      project: {
        id: dataset.project.id,
        name: dataset.project.name
      },
      storageMode: dataset.storageMode,
      sourceType: dataset.sourceType,
      schemaVersion: dataset.schemaVersion,
      updatedAt: dataset.updatedAt,
      capabilities: {
        read: dataset.capabilities.read,
        write: dataset.capabilities.write,
        sync: dataset.capabilities.sync
      }
    }))
  };
}
__name(projectDiscovery, "projectDiscovery");
function projectInspection(dataset, layout) {
  return {
    dataset: {
      datasetId: dataset.datasetId,
      storageMode: dataset.storageMode,
      capabilities: dataset.capabilities,
      binding: {
        datasetId: dataset.binding.datasetId,
        storageMode: dataset.binding.storageMode,
        sourceType: dataset.binding.sourceType,
        schemaVersion: dataset.binding.schemaVersion,
        syncPolicy: dataset.binding.syncPolicy
      },
      sync: dataset.sync
    },
    schema: {
      schemaVersion: layout.schemaVersion,
      columns: layout.columns,
      subitemColumns: layout.subitemColumns,
      structureGroups: layout.structureGroups,
      primaryGroupingColumnId: layout.primaryGroupingColumnId,
      views: layout.views,
      capabilities: layout.capabilities
    }
  };
}
__name(projectInspection, "projectInspection");
function projectQuery(response, maxRows) {
  return {
    ...response,
    rows: response.rows.slice(0, maxRows)
  };
}
__name(projectQuery, "projectQuery");
function agentMutationContext(toolCallId) {
  const normalized = toolCallId?.trim();
  if (!normalized || normalized.length > 190) {
    throw new ProcessTableToolError({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      requestId: ""
    });
  }
  return {
    origin: "agent",
    commandId: `ai:${normalized}`
  };
}
__name(agentMutationContext, "agentMutationContext");
function mutationResult(context, result) {
  if ("deleted" in result) {
    return {
      origin: context.origin,
      commandId: context.commandId,
      rowId: result.rowId,
      deleted: result.deleted
    };
  }
  return {
    origin: context.origin,
    commandId: context.commandId,
    rowId: result.rowId,
    datasetId: result.datasetId,
    updatedAt: result.updatedAt
  };
}
__name(mutationResult, "mutationResult");
function resolveLimits(input) {
  return {
    maxQueryRows: boundedInteger(input?.maxQueryRows ?? PROCESS_TABLE_TOOL_LIMITS.defaultMaxQueryRows, PROCESS_TABLE_TOOL_LIMITS.hardMaxQueryRows, "maxQueryRows"),
    maxInputBytes: boundedInteger(input?.maxInputBytes ?? PROCESS_TABLE_TOOL_LIMITS.defaultMaxInputBytes, PROCESS_TABLE_TOOL_LIMITS.hardMaxInputBytes, "maxInputBytes"),
    maxResultBytes: boundedInteger(input?.maxResultBytes ?? PROCESS_TABLE_TOOL_LIMITS.defaultMaxResultBytes, PROCESS_TABLE_TOOL_LIMITS.hardMaxResultBytes, "maxResultBytes")
  };
}
__name(resolveLimits, "resolveLimits");
function boundedInteger(value, maximum, name) {
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    throw new TypeError(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}
__name(boundedInteger, "boundedInteger");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PROCESS_TABLE_MUTATION_TOOL_NAMES,
  PROCESS_TABLE_READ_TOOL_NAMES,
  PROCESS_TABLE_TOOL_LIMITS,
  ProcessTableToolError,
  createProcessTableTools,
  toProcessTableToolError
});
//# sourceMappingURL=index.cjs.map