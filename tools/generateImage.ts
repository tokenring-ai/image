import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { z } from "zod";
import ImageService from "../ImageService.ts";

const name = "image_generate";
const displayName = "Image Generation/generateImage";

async function execute(args: z.output<typeof inputSchema>, agent: Agent): Promise<TokenRingToolResult> {
  const imageService = agent.requireServiceByType(ImageService);

  const result = await imageService.generateImage(args, agent);

  return {
    message: `**Image** Generated image ${result.filePath}`,
    result: JSON.stringify({ path: result.filePath }),
  };
}

const description = "Generate an AI image and save it to the shared media library";

const inputSchema = z.object({
  prompt: z.string().describe("Description of the image to generate"),
  aspectRatio: z.enum(["square", "tall", "wide"]).default("square"),
  keywords: z.array(z.string()).describe("Keywords to add to image EXIF/IPTC metadata").exactOptional(),
});

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
