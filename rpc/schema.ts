import { AgentNotFoundSchema } from "@tokenring-ai/agent/schema";
import type { RPCSchema } from "@tokenring-ai/rpc/types";
import { z } from "zod";

export const ImageIndexEntrySchema = z.object({
  kind: z.literal("image").default("image"),
  filename: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number(),
  keywords: z.array(z.string()),
});

export type ImageIndexEntry = z.output<typeof ImageIndexEntrySchema>;

export default {
  name: "Image Generation RPC",
  path: "/rpc/image",
  methods: {
    getImages: {
      type: "query",
      input: z.object({
        search: z.string().exactOptional(),
        limit: z.number().int().positive().default(200).exactOptional(),
      }),
      result: z.object({
        images: z.array(ImageIndexEntrySchema),
        count: z.number(),
      }),
    },
    generateImage: {
      type: "mutation",
      input: z.object({
        agentId: z.string(),
        prompt: z.string(),
        model: z.string().exactOptional(),
        aspectRatio: z.enum(["square", "tall", "wide"]).default("square").exactOptional(),
        keywords: z.array(z.string()).exactOptional(),
      }),
      result: z.discriminatedUnion("status", [
        z.object({
          status: z.literal("success"),
          filename: z.string(),
          width: z.number(),
          height: z.number(),
          mimeType: z.string(),
          message: z.string(),
        }),
        AgentNotFoundSchema,
      ]),
    },
  },
} satisfies RPCSchema;
