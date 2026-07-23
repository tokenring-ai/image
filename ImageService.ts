import { Buffer } from "node:buffer";
import type Agent from "@tokenring-ai/agent/Agent";
import type { AgentCreationContext } from "@tokenring-ai/agent/types";
import { ImageGenerationModelRegistry } from "@tokenring-ai/ai-client/ModelRegistry";
import type TokenRingApp from "@tokenring-ai/app";
import type { TokenRingService } from "@tokenring-ai/app/types";
import { ConfigurationError } from "@tokenring-ai/app/types";
import FileSystemService from "@tokenring-ai/filesystem/FileSystemService";
import MediaLibraryService from "@tokenring-ai/media-library/MediaLibraryService";
import deepClone from "@tokenring-ai/utility/object/deepClone";
import { exiftool } from "exiftool-vendored";
import type { AdjustImageFormat, AdjustImageOptions, GenerateImageOptions } from "./schema.ts";
import { ImageGenerationAgentConfigSchema, type ParsedImageGenerationConfig } from "./schema.ts";
import { ImageState } from "./state/ImageState.ts";

const FORMAT_INFO: Record<AdjustImageFormat, { mediaType: string; extension: string }> = {
  jpeg: { mediaType: "image/jpeg", extension: "jpg" },
  png: { mediaType: "image/png", extension: "png" },
  webp: { mediaType: "image/webp", extension: "webp" },
  avif: { mediaType: "image/avif", extension: "avif" },
  heic: { mediaType: "image/heic", extension: "heic" },
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
      if (foundModels[0]) {
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
    const { model = this.defaultModel, ...agentConfig } = deepClone(
      this.options.agentDefaults,
      agent.getAgentConfigSlice("imageGeneration", ImageGenerationAgentConfigSchema),
    );

    agent.initializeState(ImageState, {
      ...agentConfig,
      ...(model && {
        model,
      }),
    });

    creationContext.items.push(`Image Generation Model: ${model ?? "No model selected"}`);
  }

  getOutputDirectory(agent: Agent): string {
    return agent.requireServiceByType(MediaLibraryService).getOutputDirectory(agent);
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
    if (!model) throw new ConfigurationError(this.name, "No image generation model is currently selected");
    return model;
  }

  async reindex(agent: Agent): Promise<void> {
    await agent.requireServiceByType(MediaLibraryService).reindex(agent, ["image"]);
  }

  async generateImage(
    { keywords, ...request }: GenerateImageOptions,
    agent: Agent,
  ): Promise<{
    mediaType: string;
    fileName: string;
    filePath: string;
    width?: number;
    height?: number;
    buffer: Buffer;
  }> {
    const imageModelRegistry = agent.requireServiceByType(ImageGenerationModelRegistry);
    const mediaLibrary = agent.requireServiceByType(MediaLibraryService);

    const model = this.requireModel(agent);

    agent.infoMessage(`[${this.name}] Generating image: "${request.prompt}"`);

    const imageClient = imageModelRegistry.getClient(model);

    const widthAndHeight = imageClient.determineBestSize(request.sizing);

    const [imageResult] = await imageClient.generateImage({ widthAndHeight, ...request }, agent);

    const imageBuffer = Buffer.from(imageResult.uint8Array);
    const media = await mediaLibrary.writeMedia(
      {
        kind: "image",
        buffer: imageBuffer,
        mimeType: imageResult.mediaType,
        ...widthAndHeight,
        keywords: keywords ?? [],
        prompt: request.prompt,
      },
      agent,
    );

    const exifData: any = {};
    if (keywords && keywords.length > 0) {
      exifData.Keywords = keywords;
    }
    exifData.ImageDescription = request.prompt;

    try {
      await exiftool.write(media.filePath, exifData);
      agent.infoMessage(`[${this.name}] Added metadata to EXIF data`);
    } catch (error: unknown) {
      agent.warningMessage(`[${this.name}] Failed to write EXIF data:`, error as Error);
    }

    return {
      mediaType: imageResult.mediaType,
      buffer: imageBuffer,
      fileName: media.filename,
      filePath: media.filePath,
      ...widthAndHeight,
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

    const outputFormat = format ?? sourceMetadata.format;

    let encoded: Bun.Image;
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
      case "avif":
        encoded = quality !== undefined ? pipeline.avif({ quality }) : pipeline.avif();
        break;
      case "heic":
        encoded = quality !== undefined ? pipeline.heic({ quality }) : pipeline.heic();
        break;
      case "bmp":
        throw new Error("BMP output not supported");
      case "gif":
        throw new Error("GIF output not supported");
      case "tiff":
        throw new Error("TIFF output not supported");
      default: {
        const exhaustive: any = outputFormat satisfies never;
        throw new Error(`Unsupported output format: ${exhaustive}`);
      }
    }

    const formatInfo = FORMAT_INFO[outputFormat];

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
