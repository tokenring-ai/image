import { z } from "zod";

export const ImageGenerationAgentConfigSchema = z
  .object({
    model: z.string().exactOptional(),
  })
  .default({});

export const ImageServiceConfigSchema = z.object({
  defaultModels: z.array(z.string()).default([]),
  agentDefaults: z
    .object({
      model: z.string().exactOptional(),
    })
    .default({}),
});

export type ImageServiceConfig = z.input<typeof ImageServiceConfigSchema>;
export type ParsedImageGenerationConfig = z.output<typeof ImageServiceConfigSchema>;
