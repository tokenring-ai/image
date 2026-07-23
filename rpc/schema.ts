import type { RPCSchema } from "@tokenring-ai/rpc/types";
import { AgentNotFoundSchema, SuccessSchema } from "@tokenring-ai/rpc/types";
import { z } from "zod";

import { GenerateImageOptionsSchema } from "../schema.ts";

export default {
  name: "Image Generation RPC",
  path: "/rpc/image",
  methods: {
    generateImage: {
      type: "mutation",
      input: z.object({
        agentId: z.string(),
        model: z.string().exactOptional(),
        request: GenerateImageOptionsSchema,
      }),
      result: z.discriminatedUnion("status", [
        SuccessSchema.extend({
          results: z.array(
            z.object({
              fileName: z.string(),
              width: z.number().exactOptional(),
              height: z.number().exactOptional(),
              mediaType: z.string(),
            }),
          ),
        }),
        AgentNotFoundSchema,
      ]),
    },
  },
} satisfies RPCSchema;
