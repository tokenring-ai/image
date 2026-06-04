import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import ImageService from "../../ImageService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const imageService = agent.requireServiceByType(ImageService);
  await imageService.reindex(agent);
  return "Image media re-indexed successfully.";
}

export default {
  name: "image reindex",
  description: "Reindex images in the media library directory",
  inputSchema,
  execute,
  help: `Regenerate the media_index.json file by scanning all images in the media library directory and reading their metadata.

## Example

/image reindex`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
