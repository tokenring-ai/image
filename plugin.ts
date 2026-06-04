import { AgentCommandService } from "@tokenring-ai/agent";
import type { TokenRingPlugin } from "@tokenring-ai/app";
import { ChatService } from "@tokenring-ai/chat";
import { RpcService } from "@tokenring-ai/rpc";
import { z } from "zod";
import agentCommands from "./commands.ts";
import ImageService from "./ImageService.ts";
import packageJSON from "./package.json" with { type: "json" };
import imageGenerationRPC from "./rpc/imageGeneration.ts";
import { ImageServiceConfigSchema } from "./schema.ts";
import tools from "./tools.ts";

const packageConfigSchema = z.object({
  imageGeneration: ImageServiceConfigSchema,
});

export default {
  name: packageJSON.name,
  displayName: "Image Generation",
  version: packageJSON.version,
  description: packageJSON.description,
  install(app, config) {
    app.addServices(new ImageService(app, config.imageGeneration));
    app.waitForService(ChatService, chatService => chatService.addTools(...tools));
    app.waitForService(AgentCommandService, agentCommandService => agentCommandService.addAgentCommands(agentCommands));
    app.waitForService(RpcService, rpcService => {
      rpcService.registerEndpoint(imageGenerationRPC);
    });
  },
  config: packageConfigSchema,
} satisfies TokenRingPlugin<typeof packageConfigSchema>;
