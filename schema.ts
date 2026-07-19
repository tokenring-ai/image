import { z } from "zod";

export const ImageGenerationAgentConfigSchema = z
  .object({
    model: z.string().exactOptional(),
  })
  .default({});

export const ImageServiceConfigSchema = z
  .object({
    defaultModels: z.array(z.string()).default([]).meta({ description: "Model name patterns offered for image generation (* matches all)" }),
    agentDefaults: z
      .object({
        model: z.string().exactOptional().meta({ description: "Image model new agents use by default" }),
      })
      .default({})
      .meta({ label: "Agent Defaults" }),
  })
  .meta({ label: "Image Generation" });

export type ImageServiceConfig = z.input<typeof ImageServiceConfigSchema>;
export type ParsedImageGenerationConfig = z.output<typeof ImageServiceConfigSchema>;
