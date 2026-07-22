import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import { z } from "zod";
import ImageService from "../ImageService.ts";

const name = "image_adjust";
const displayName = "Image Generation/adjustImage";

async function execute(args: z.output<typeof inputSchema>, agent: Agent): Promise<TokenRingToolResult> {
  const imageService = agent.requireServiceByType(ImageService);

  const result = await imageService.adjustImage(args, agent);

  return {
    message: `**Image** Adjusted image ${args.source}`,
    result: JSON.stringify({
      path: result.filePath,
      fileName: result.fileName,
      mediaType: result.mediaType,
      width: result.width,
      height: result.height,
    }),
  };
}

const description =
  "Adjust an existing image using Bun.Image. Supports converting between formats (jpeg, png, webp), scaling by a ratio, and adjusting brightness. The result is saved as a new file in the shared media library.";

const inputSchema = z.object({
  source: z.string().describe("Source image to adjust. Pass a filename (resolved relative to the media library directory) or a relative/absolute path."),
  format: z.enum(["jpeg", "png", "webp"]).describe("Output image format. Defaults to the source image's format.").exactOptional(),
  scale: z.number().positive().describe("Scale ratio to apply to width and height (e.g. 0.5 halves dimensions, 2 doubles them).").exactOptional(),
  brightness: z.number().nonnegative().describe("Brightness multiplier. 1.0 leaves brightness unchanged, <1 darkens, >1 brightens.").exactOptional(),
  quality: z.number().int().min(1).max(100).describe("Output quality (1-100) for lossy formats (jpeg, webp).").exactOptional(),
});

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
