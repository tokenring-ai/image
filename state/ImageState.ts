import { AgentStateSlice } from "@tokenring-ai/agent/types";
import { z } from "zod";
import type { ParsedImageGenerationConfig } from "../schema.ts";

const serializationSchema = z.object({
  model: z.string().nullable(),
});

export class ImageState extends AgentStateSlice<typeof serializationSchema> {
  model: string | null;

  constructor(readonly initialConfig: ParsedImageGenerationConfig["agentDefaults"]) {
    super("ImageGenerationState", serializationSchema);
    this.model = initialConfig.model ?? null;
  }

  serialize(): z.output<typeof serializationSchema> {
    return { model: this.model };
  }

  deserialize(data: z.output<typeof serializationSchema>): void {
    this.model = data.model;
  }

  show(): string {
    return `Image Model: ${this.model ?? "(none)"}`;
  }
}
