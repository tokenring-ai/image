import type { TreeLeaf } from "@tokenring-ai/agent/question";
import type { AgentCommandInputSchema, AgentCommandInputType, TokenRingAgentCommand } from "@tokenring-ai/agent/types";
import { ImageGenerationModelRegistry } from "@tokenring-ai/ai-client/ModelRegistry";
import ImageService from "../../../ImageService.ts";

const inputSchema = {} as const satisfies AgentCommandInputSchema;

async function execute({ agent }: AgentCommandInputType<typeof inputSchema>): Promise<string> {
  const registry = agent.requireServiceByType(ImageGenerationModelRegistry);
  const imageService = agent.requireServiceByType(ImageService);
  const modelsByProvider = await agent.busyWithActivity("Checking online status of models...", registry.getModelsByProvider());
  const tree: TreeLeaf[] = Object.entries(modelsByProvider)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([provider, providerModels]) => {
      const sorted = Object.entries(providerModels).sort(([, a], [, b]) =>
        a.status === b.status ? a.modelSpec.modelId.localeCompare(b.modelSpec.modelId) : a.status.localeCompare(b.status),
      );
      const onlineCount = Object.values(providerModels).filter(m => m.status === "online").length;
      return {
        name: `${provider} (${onlineCount}/${Object.keys(providerModels).length} online)`,
        children: sorted.map(([modelName, model]) => ({
          value: modelName,
          name: model.status === "online" ? model.modelSpec.modelId : `${model.modelSpec.modelId} (${model.status})`,
        })),
      };
    });
  const selection = await agent.askQuestion({
    message: "Choose an image generation model:",
    question: {
      type: "treeSelect",
      label: "Model Selection",
      key: "result",
      minimumSelections: 1,
      maximumSelections: 1,
      tree,
    },
  });
  if (selection?.[0]) {
    imageService.setModel(selection[0], agent);
    return `Image model set to ${selection[0]}`;
  }
  return "Model selection cancelled. No changes made.";
}

export default {
  name: "image model select",
  description: "Interactively select an image generation model",
  inputSchema,
  execute,
  help: `Open an interactive tree-based selector to choose an image generation model. Models are grouped by provider with availability status.

## Example

/image model select`,
} satisfies TokenRingAgentCommand<typeof inputSchema>;
