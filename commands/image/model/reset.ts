import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import ImageService from "../../../ImageService.ts";
import { ImageState } from "../../../state/ImageState.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

function execute({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const initialModel = agent.getState(ImageState).initialConfig.model;
  if (!initialModel) throw new CommandFailedError("No initial image model configured");
  agent.requireServiceByType(ImageService).setModel(initialModel, agent);
  return Promise.resolve(`Image model reset to ${initialModel}`);
}

export default {
  name: "image model reset",
  description: "Reset to initial image generation model",
  inputSchema,
  execute,
  help: `Reset the image generation model to the initial configured value.

## Example

/image model reset`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
