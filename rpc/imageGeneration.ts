import { AgentManager } from "@tokenring-ai/agent";
import type TokenRingApp from "@tokenring-ai/app";
import MediaLibraryService from "@tokenring-ai/media-library/MediaLibraryService";
import { createRPCEndpoint } from "@tokenring-ai/rpc/createRPCEndpoint";
import ImageService from "../ImageService.ts";
import ImageGenerationRpcSchema from "./schema.ts";

export default createRPCEndpoint(ImageGenerationRpcSchema, {
  async getImages(args, app: TokenRingApp) {
    const mediaLibrary = app.requireService(MediaLibraryService);
    const images = await mediaLibrary.getEntriesFromDirectory(mediaLibrary.getDefaultOutputDirectory(), {
      kind: "image",
      search: args.search,
    });
    const limitedImages = images.slice(0, args.limit ?? 200);

    return {
      images: limitedImages.map(image => ({
        kind: "image" as const,
        filename: image.filename,
        mimeType: image.mimeType,
        width: image.width ?? 0,
        height: image.height ?? 0,
        keywords: image.keywords,
      })),
      count: images.length,
    };
  },

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
