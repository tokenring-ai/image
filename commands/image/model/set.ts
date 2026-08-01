import { CommandFailedError } from "@tokenring-ai/agent/AgentError";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import ImageService from "../../../ImageService.ts";

const inputSchema = {
  args: {},
  positionals: [
    {
      name: "modelName",
      description: "The image model name to set",
      required: true,
    },
  ],
} as const satisfies AgentCommandInputSchema;

function execute({ args, agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const modelName = args.modelName;
  if (!modelName) throw new CommandFailedError("Model name required. Usage: /image model set <model_name>");
  agent.requireService(ImageService).setModel(modelName, agent);
  return Promise.resolve(`Image model set to ${modelName}`);
}

export default {
  name: "image model set",
  description: "Set the image generation model",
  inputSchema,
  execute,
  help: `Set the image generation model to a specific model by name.

## Example

/image model set openai:dall-e-3`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
