import { TableClient } from '@process.co/table-client';
import {
  createProcessTableTools,
  type ProcessTableToolsOptions,
} from '@process.co/table-ai-sdk';
import {
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
} from 'ai';

type RouteHandlerOptions = {
  model: LanguageModel;
  tableClient: TableClient;
  mutations?: ProcessTableToolsOptions['mutations'];
};

/**
 * Provider-neutral Web API route example. The application supplies its model
 * and a server-scoped Table client; neither choice is bundled by this package.
 */
export function createProcessTableRouteHandler(options: RouteHandlerOptions) {
  const tools = createProcessTableTools({
    client: options.tableClient,
    mutations: options.mutations,
  });

  return async function POST(request: Request): Promise<Response> {
    const body = (await request.json()) as { messages?: ModelMessage[] };
    if (!Array.isArray(body.messages)) {
      return Response.json({ error: 'messages required' }, { status: 400 });
    }

    return streamText({
      model: options.model,
      messages: body.messages,
      tools,
      stopWhen: stepCountIs(5),
    }).toUIMessageStreamResponse();
  };
}
