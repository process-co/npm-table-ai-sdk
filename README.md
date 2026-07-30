# @process.co/table-ai-sdk

Provider-neutral AI SDK tools over `@process.co/table-client`. This package does
not provide hosting, choose an LLM provider, or read credentials from browser or
model input.

## Install

```bash
npm install @process.co/table-ai-sdk @process.co/table-client ai@^7 zod
```

AI SDK 7 is the recommended peer and requires Node.js 22 or newer. AI SDK 6
remains supported for Node.js 20 consumers, but currently installs an upstream
`undici` version with known security advisories. Both peer majors are exercised
by the packed-consumer release gate.

## Server-side use

Create the Table client in trusted server code. The base URL, `pct_` credential,
team binding, project binding, and principal identity are closure state and do
not appear in any tool input schema or result.

```typescript
import { TableClient } from '@process.co/table-client';
import { createProcessTableTools } from '@process.co/table-ai-sdk';

const tableClient = new TableClient({
  baseUrl: process.env.PROCESS_TABLE_BASE_URL!,
  getToken: () => process.env.PROCESS_TABLE_TOKEN!,
});

const tools = createProcessTableTools({ client: tableClient });
```

The default toolset is read-only:

- `listProcessDatasets`
- `inspectProcessDataset`
- `queryProcessRows`
- `getProcessRow`

The model may select a logical dataset or row. It cannot supply a token,
principal, team, project, base URL, physical database, or collection.
Authorization remains bound to the server-side Table principal.
Recursive filter inputs use reference-aware JSON Schema conversion for AI SDK
provider calls.

## Bounds

Defaults are 50 query rows, 32 KiB of tool input, and 256 KiB of tool output.
Configuration may lower these limits. Exported hard caps prevent configuration
from exceeding 200 rows, 128 KiB of input, or 1 MiB of output. Query limits are
clamped after schema validation, and every result is measured before it is
returned to the model.

```typescript
const tools = createProcessTableTools({
  client: tableClient,
  limits: {
    maxQueryRows: 25,
    maxResultBytes: 128 * 1024,
  },
});
```

## Explicit mutations and approval

Mutation tools are absent unless the server opts in:

```typescript
const tools = createProcessTableTools({
  client: tableClient,
  mutations: { enabled: true },
});
```

`insertProcessRow`, `updateProcessRow`, and `deleteProcessRow` set AI SDK
`needsApproval: true`. Their execute functions derive a command id from the
server-side AI SDK tool-call id and attach `origin: agent`; neither value can be
provided by the model. Edge accepts this context only for an authenticated
external Table principal, records agent origin on row events, and makes
same-principal/same-command inserts idempotent. Mutations return a compact
receipt rather than the full row. A committed mutation is never converted into
a response-size failure; result-byte failures apply to side-effect-free read
tools.

The host application must implement the AI SDK approval-response flow. Enabling
the tools alone is not approval.

## Errors and logging

Tool failures throw `ProcessTableToolError`. Its safe public fields are
`code`, `statusCode`, and `requestId`; upstream error text is not returned to
the model. Treat row values, columns, activity, attachments, filters, and tool
results as potentially sensitive data:

- do not log tool inputs or results by default;
- log only tool name, Process error code, request id, latency, and row count;
- do not place `pct_` credentials in prompts, traces, client-readable
  environment variables, or error messages;
- use dataset allowlists and read-only scopes unless a mutation workflow is
  explicitly required.

## Route Handler example

[`examples/route-handler.ts`](./examples/route-handler.ts) is a build-checked
Web API Route Handler factory. The application injects its own AI SDK model and
server-scoped Table client, so the example has no provider or hosting
dependency. It uses a five-step stop condition so the model can consume tool
results and finish the turn without an unbounded tool loop.

## Validation

```bash
pnpm --filter @process.co/table-ai-sdk lint
pnpm --filter @process.co/table-ai-sdk test --runInBand
pnpm --filter @process.co/table-ai-sdk build
pnpm --filter @process.co/table-ai-sdk build:example
pnpm --filter @process.co/table-ai-sdk test:packed
```

Validated builds are hoisted from the monorepo to
[`process-co/npm-table-ai-sdk`](https://github.com/process-co/npm-table-ai-sdk).
The sync resolves the monorepo-only client workspace range to the matching
public `@process.co/table-client` version. GitHub releases in the distribution
repository publish npm versions and verify fresh ESM/CommonJS consumers.

The packed test exercises the client and tools over an HTTP fixture from
outside the workspace. The optional `test:live` path uses a real scoped
credential and requires exact API and Edge build identities; see the
[external-principal acceptance runbook](../../docs/table-platform/operations/runbooks/external-principal-e2e.md).
