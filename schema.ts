import { ImageRequestSchema, ImageSizingSchema } from "@tokenring-ai/ai-client/schema.client";
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
export const GenerateImageOptionsSchema = ImageRequestSchema.omit({
  prompt: true,
  widthAndHeight: true,
}).extend({
  prompt: z.string().describe("Description of the image to generate"),
  sizing: ImageSizingSchema,
  keywords: z.array(z.string()).describe("Keywords to add to image EXIF/IPTC metadata").exactOptional(),
});
export type GenerateImageOptions = z.input<typeof GenerateImageOptionsSchema>;
export type AdjustImageFormat = "jpeg" | "png" | "webp" | "avif" | "heic";
export type AdjustImageOptions = {
  source: string;
  format?: AdjustImageFormat | undefined;
  scale?: number | undefined;
  brightness?: number | undefined;
  quality?: number | undefined;
};
