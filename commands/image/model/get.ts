import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import ImageService from "../../../ImageService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

function execute({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  return Promise.resolve(`Current image model: ${agent.requireServiceByType(ImageService).getModel(agent) ?? "(none)"}`);
}

export default {
  name: "image model get",
  description: "Show current image generation model",
  inputSchema,
  execute,
  help: `Show the currently active image generation model.

## Example

/image model get`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
