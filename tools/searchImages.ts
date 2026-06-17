import type Agent from "@tokenring-ai/agent/Agent";
import type { TokenRingToolDefinition, TokenRingToolResult } from "@tokenring-ai/chat/schema";
import MediaLibraryService from "@tokenring-ai/media-library/MediaLibraryService";
import { z } from "zod";

const name = "image_search";
const displayName = "Image Generation/searchImages";

async function execute({ query, limit  }: z.output<typeof inputSchema>, agent: Agent): Promise<TokenRingToolResult> {
  const mediaLibrary = agent.requireServiceByType(MediaLibraryService);
  const topResults = await mediaLibrary.search(query, { kind: "image", limit }, agent);

  agent.infoMessage(`[${name}] Returning ${topResults.length} image matches`);

  return JSON.stringify({
    results: topResults.map(r => ({
      filename: r.filename,
      path: r.path,
      score: r.score,
      mimeType: r.mimeType,
      width: r.width,
      height: r.height,
      keywords: r.keywords,
    })),
    message: `Found ${topResults.length} images matching "${query}"`,
  });
}

const description = "Search for images in the index based on keyword similarity";

const inputSchema = z.object({
  query: z.string().describe("Search query to match against image keywords"),
  limit: z.number().int().positive().default(10).describe("Maximum number of results to return"),
});

export default {
  name,
  displayName,
  description,
  inputSchema,
  execute,
} satisfies TokenRingToolDefinition<typeof inputSchema>;
