import { AgentManager } from "@tokenring-ai/agent";
import type TokenRingApp from "@tokenring-ai/app";
import { createRPCEndpoint } from "@tokenring-ai/rpc/createRPCEndpoint";
import ImageService from "../ImageService.ts";
import ImageGenerationRpcSchema from "./schema.ts";

export default createRPCEndpoint(ImageGenerationRpcSchema, {
  async generateImage(args, app: TokenRingApp) {
    const agent = app.requireService(AgentManager).getAgent(args.agentId);
    if (!agent) {
      return { status: "agentNotFound" };
    }

    const imageService = app.requireService(ImageService);
    const previousModel = imageService.getModel(agent);
    if (args.model) {
      imageService.setModel(args.model, agent);
    }

    try {
      const result = await imageService.generateImage(
        {
          prompt: args.prompt,
          aspectRatio: args.aspectRatio,
          keywords: args.keywords,
        },
        agent,
      );

      return {
        status: "success" as const,
        filename: result.fileName,
        width: result.width,
        height: result.height,
        mimeType: result.mediaType,
        message: `Generated: ${result.fileName}`,
      };
    } finally {
      if (args.model) {
        imageService.setModel(previousModel, agent);
      }
    }
  },
});
