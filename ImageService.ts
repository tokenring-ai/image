import type Agent from "@tokenring-ai/agent/Agent";
import type { AgentCreationContext } from "@tokenring-ai/agent/types";
import type { ImageRequest } from "@tokenring-ai/ai-client/client/AIImageGenerationClient";
import { ImageGenerationModelRegistry } from "@tokenring-ai/ai-client/ModelRegistry";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import MediaLibraryService from "@tokenring-ai/media-library/MediaLibraryService";
import deepClone from "@tokenring-ai/utility/object/deepClone";
import { exiftool } from "exiftool-vendored";
import { Buffer } from "node:buffer";
import { ImageGenerationAgentConfigSchema, type ParsedImageGenerationConfig } from "./schema.ts";
import { ImageState } from "./state/ImageState.ts";

export type GenerateImageOptions = Omit<ImageRequest, "size" | "aspectRatio" | "prompt"> & {
  prompt: string;
  aspectRatio?: "square" | "tall" | "wide" | undefined;
  keywords?: string[] | undefined;
};

export type AdjustImageFormat = "jpeg" | "png" | "webp";

export type AdjustImageOptions = {
  source: string;
  format?: AdjustImageFormat | undefined;
  scale?: number | undefined;
  brightness?: number | undefined;
  quality?: number | undefined;
};

const FORMAT_INFO: Record<AdjustImageFormat, { mediaType: string; extension: string }> = {
  jpeg: { mediaType: "image/jpeg", extension: "jpg" },
  png: { mediaType: "image/png", extension: "png" },
  webp: { mediaType: "image/webp", extension: "webp" },
};

export default class ImageService implements TokenRingService {
  readonly name = "ImageService";
  description = "Image generation and editing backed by the shared media library";

  defaultModel: string | null = null;

  constructor(
    private app: TokenRingApp,
    private options: ParsedImageGenerationConfig,
  ) {}

  start() {
    const imageModelRegistry = this.app.requireService(ImageGenerationModelRegistry);

    for (const modelName of this.options.defaultModels) {
      const foundModels = Object.keys(imageModelRegistry.getModelSpecsByRequirements(modelName));
      if (foundModels?.[0]) {
        this.defaultModel = foundModels[0];
        break;
      }
    }

    if (this.defaultModel) {
      this.app.serviceOutput(this, `Selected ${this.defaultModel} as default image generation model`);
    } else {
      this.app.serviceError(this, `No default image generation model was configured`);
    }
  }

  attach(agent: Agent, creationContext: AgentCreationContext): void {
    const agentConfig = deepClone(this.options.agentDefaults, agent.getAgentConfigSlice("imageGeneration", ImageGenerationAgentConfigSchema));
    const initialState = agent.initializeState(ImageState, agentConfig);

    const selectedModel = initialState.model ?? this.defaultModel;
    creationContext.items.push(`Image Generation Model: ${selectedModel ?? "No model selected"}`);
  }

  getDefaultOutputDirectory(): string {
    return this.app.requireService(MediaLibraryService).getDefaultOutputDirectory();
  }

  getOutputDirectory(agent: Agent): string {
    return agent.requireServiceByType(MediaLibraryService).getOutputDirectory(agent);
  }

  getDefaultModel(): string | null {
    return this.defaultModel;
  }

  getModel(agent: Agent): string | null {
    return agent.getState(ImageState).model ?? this.defaultModel;
  }

  setModel(model: string | null, agent: Agent): void {
    agent.mutateState(ImageState, state => {
      state.model = model;
    });
  }

  requireModel(agent: Agent): string {
    const model = this.getModel(agent);
    if (!model) throw new Error("No image generation model is currently selected");
    return model;
  }

  async reindex(agent: Agent): Promise<void> {
    await agent.requireServiceByType(MediaLibraryService).reindex(agent, ["image"]);
  }

  async generateImage(
    { prompt, aspectRatio = "square", keywords }: GenerateImageOptions,
    agent: Agent,
  ): Promise<{
    mediaType: string;
    fileName: string;
    filePath: string;
    width: number;
    height: number;
    buffer: Buffer;
  }> {
    const imageModelRegistry = agent.requireServiceByType(ImageGenerationModelRegistry);
    const mediaLibrary = agent.requireServiceByType(MediaLibraryService);

    const model = this.requireModel(agent);

    agent.infoMessage(`[${this.name}] Generating image: "${prompt}"`);

    const imageClient = imageModelRegistry.getClient(model);

    let size: `${number}x${number}`;
    let width: number, height: number;
    switch (aspectRatio) {
      case "square":
        size = "1024x1024";
        width = 1024;
        height = 1024;
        break;
      case "tall":
        size = "1024x1536";
        width = 1024;
        height = 1536;
        break;
      case "wide":
        size = "1536x1024";
        width = 1536;
        height = 1024;
        break;
      default:
        size = "1024x1024";
        width = 1024;
        height = 1024;
    }

    const [imageResult] = await imageClient.generateImage({ prompt, size, n: 1 }, agent);

    const imageBuffer = Buffer.from(imageResult.uint8Array);
    const media = await mediaLibrary.writeMedia(
      {
        kind: "image",
        buffer: imageBuffer,
        mimeType: imageResult.mediaType,
        width,
        height,
        keywords: keywords ?? [],
        prompt,
      },
      agent,
    );

    const exifData: any = {};
    if (keywords && keywords.length > 0) {
      exifData.Keywords = keywords;
    }
    exifData.ImageDescription = prompt;

    try {
      await exiftool.write(media.filePath, exifData);
      agent.infoMessage(`[${this.name}] Added metadata to EXIF data`);
    } catch (error: unknown) {
      agent.warningMessage(`[${this.name}] Failed to write EXIF data:`, error as Error);
    }

    agent.infoMessage(`[${this.name}] Image saved: ${media.filePath}`);

    return {
      mediaType: imageResult.mediaType,
      buffer: imageBuffer,
      fileName: media.filename,
      filePath: media.filePath,
      width,
      height,
    };
  }

  async adjustImage(
    { source, format, scale, brightness, quality }: AdjustImageOptions,
    agent: Agent,
  ): Promise<{
    mediaType: string;
    fileName: string;
    filePath: string;
    width: number;
    height: number;
    buffer: Buffer;
  }> {
    const fileSystem = agent.requireServiceByType(FileSystemService);
    const mediaLibrary = agent.requireServiceByType(MediaLibraryService);

    if (!source) {
      throw new Error("Source path is required");
    }

    const targetDir = this.getOutputDirectory(agent);
    const sourcePath = source.includes("/") ? source : `${targetDir}/${source}`;

    agent.infoMessage(`[${this.name}] Adjusting image: ${sourcePath}`);

    const sourceBuffer = await fileSystem.readFile(sourcePath, agent);
    if (!sourceBuffer) {
      throw new Error(`Failed to read source image: ${sourcePath}`);
    }

    const sourceBytes = new Uint8Array(sourceBuffer.buffer, sourceBuffer.byteOffset, sourceBuffer.byteLength);
    const sourceMetadata = await new Bun.Image(sourceBytes).metadata();

    let pipeline = new Bun.Image(sourceBytes);
    let width = sourceMetadata.width;
    let height = sourceMetadata.height;

    if (scale !== undefined && scale !== 1) {
      if (scale <= 0) throw new Error("Scale must be greater than 0");
      width = Math.max(1, Math.round(sourceMetadata.width * scale));
      height = Math.max(1, Math.round(sourceMetadata.height * scale));
      pipeline = pipeline.resize(width, height);
    }

    if (brightness !== undefined && brightness !== 1) {
      pipeline = pipeline.modulate({ brightness });
    }

    const outputFormat: AdjustImageFormat = format ?? (sourceMetadata.format as AdjustImageFormat) ?? "jpeg";
    const formatInfo = FORMAT_INFO[outputFormat];
    if (!formatInfo) {
      throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    let encoded;
    switch (outputFormat) {
      case "jpeg":
        encoded = quality !== undefined ? pipeline.jpeg({ quality }) : pipeline.jpeg();
        break;
      case "webp":
        encoded = quality !== undefined ? pipeline.webp({ quality }) : pipeline.webp();
        break;
      case "png":
        encoded = pipeline.png();
        break;
      default:
        const exhaustive: any = outputFormat satisfies never;
        throw new Error(`Unsupported output format: ${exhaustive}`);
    }

    const bytes = await encoded.bytes();
    const outputBuffer = Buffer.from(bytes);

    let keywords: string[] = [];
    let imageDescription: string | undefined;
    try {
      const sourceExif = await exiftool.read(sourcePath);
      if (Array.isArray(sourceExif.Keywords)) {
        keywords = sourceExif.Keywords;
      }
      if (typeof sourceExif.ImageDescription === "string") {
        imageDescription = sourceExif.ImageDescription;
      }
    } catch (error: unknown) {
      agent.warningMessage(`[${this.name}] Failed to read EXIF data:`, error as Error);
    }

    const media = await mediaLibrary.writeMedia(
      {
        kind: "image",
        buffer: outputBuffer,
        mimeType: formatInfo.mediaType,
        extension: formatInfo.extension,
        width,
        height,
        keywords,
        ...(imageDescription && { prompt: imageDescription }),
      },
      agent,
    );

    try {
      const exifData: any = {};
      if (keywords.length > 0) exifData.Keywords = keywords;
      if (imageDescription) exifData.ImageDescription = imageDescription;
      if (Object.keys(exifData).length > 0) {
        await exiftool.write(media.filePath, exifData);
      }
    } catch (error: unknown) {
      agent.warningMessage(`[${this.name}] Failed to copy EXIF data:`, error as Error);
    }

    agent.infoMessage(`[${this.name}] Adjusted image saved: ${media.filePath}`);

    return {
      mediaType: formatInfo.mediaType,
      buffer: outputBuffer,
      fileName: media.filename,
      filePath: media.filePath,
      width,
      height,
    };
  }
}
