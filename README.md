# @tokenring-ai/image

AI-powered image generation and editing backed by the shared media library, with EXIF metadata support.

## Overview

This package provides AI-powered image generation and editing capabilities for the Token Ring ecosystem. It integrates with the agent system to generate and adjust images, storing all media through `@tokenring-ai/media-library`.

## Key Features

- **AI Image Generation**: Generate images using configurable AI models through the model registry
- **Image Adjustment**: Convert formats, scale, and adjust brightness of existing images using Bun.Image
- **EXIF Metadata**: Add keywords and descriptions to image metadata using exiftool-vendored
- **Shared Media Library**: All images are stored and managed through `@tokenring-ai/media-library`
- **Quality and Shape Control**: Generate images with configurable quality levels and aspect ratios
- **Model Flexibility**: Support for multiple AI image generation models through the model registry
- **Interactive Model Selection**: Tree-based selector for choosing models grouped by provider
- **RPC Endpoint**: HTTP API for image generation

## Installation

```bash
bun add @tokenring-ai/image
```

## Plugin Configuration

Configure the image generation plugin in your application config:

```yaml
imageGeneration:
  defaultModels:
    - openai:dall-e-3
  agentDefaults:
    model: openai:dall-e-3
```

### Configuration Schema

The plugin uses the following configuration schema:

```typescript
import { ImageServiceConfigSchema } from "@tokenring-ai/image";

// Schema structure
ImageServiceConfigSchema = z.object({
  defaultModels: z.array(z.string()).default([]),
  agentDefaults: z.object({
    model: z.string().exactOptional(),
  }),
});
```

**Configuration Options:**

| Field | Type | Required | Description |
|---|---|---|---|
| `defaultModels` | `string[]` | No | List of model name patterns to try for default selection (`*` matches all) |
| `agentDefaults.model` | `string` | No | Default image generation model for new agents |

## Chat Commands

### /image reindex

Regenerate the media library index by scanning all images and reading their metadata.

**Usage:**

```bash
/image reindex
```

**Behavior:**

Delegates to the shared media library service to reindex all image media.

**Example Output:**

```text
Image media re-indexed successfully.
```

### /image model get

Show the currently active image generation model.

**Usage:**

```bash
/image model get
```

**Example Output:**

```text
Current image model: openai:dall-e-3
```

### /image model set <model_name>

Set the image generation model to a specific model by name.

**Usage:**

```bash
/image model set openai:dall-e-3
```

**Example Output:**

```text
Image model set to openai:dall-e-3
```

### /image model select

Open an interactive tree-based selector to choose an image generation model. Models are grouped by provider with availability status.

**Usage:**

```bash
/image model select
```

**Behavior:**

- Displays a tree of available image generation models
- Models are grouped by provider (e.g., OpenAI, Anthropic)
- Shows online/offline status for each model
- Allows interactive selection via tree navigation

**Example Output:**

```text
Choose an image generation model:
[Interactive tree selector]
Image model set to openai:dall-e-3
```

### /image model reset

Reset the image generation model to the initial configured value.

**Usage:**

```bash
/image model reset
```

**Example Output:**

```text
Image model reset to openai:dall-e-3
```

**Note:** Requires an initial model to be configured in agent defaults.

## Tools

The package provides the following tools:

### image_generate

Generate an AI image and save it to the shared media library.

**Tool Definition:**

```typescript
import { TokenRingToolDefinition } from "@tokenring-ai/chat/schema";
import { z } from "zod";

const image_generate: TokenRingToolDefinition = {
  name: "image_generate",
  displayName: "Image Generation/generateImage",
  description: "Generate an AI image and save it to the shared media library",
  inputSchema: z.object({
    prompt: z.string().describe("Description of the image to generate"),
    quality: z.enum(["ultra", "high", "standard", "low"]).describe("Quality of the generated image"),
    shape: z.enum(["square", "landscape", "portrait", "ultrawide", "ultratall"]).describe("Shape of the generated image"),
    keywords: z.array(z.string()).describe("Keywords to add to image EXIF/IPTC metadata").exactOptional(),
  }),
  execute: async (input, agent) => {
    // Implementation
  }
};
```

**Usage Example:**

```typescript
// Generate a landscape image
const result = await agent.useTool("image_generate", {
  prompt: "A beautiful mountain landscape with a lake at sunset",
  quality: "high",
  shape: "landscape",
  keywords: ["landscape", "nature", "mountains", "lake", "sunset"]
});

console.log(result); // { path: "./media/generated/abc123.png" }
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | Yes | Description of the image to generate |
| `quality` | `"ultra" \| "high" \| "standard" \| "low"` | Yes | Quality level of the generated image |
| `shape` | `"square" \| "landscape" \| "portrait" \| "ultrawide" \| "ultratall"` | Yes | Shape/aspect ratio of the generated image |
| `keywords` | `string[]` | No | Keywords to add to image EXIF/IPTC metadata |

### image_adjust

Adjust an existing image using Bun.Image. Supports converting between formats, scaling, and adjusting brightness.

**Tool Definition:**

```typescript
import { TokenRingToolDefinition } from "@tokenring-ai/chat/schema";
import { z } from "zod";

const image_adjust: TokenRingToolDefinition = {
  name: "image_adjust",
  displayName: "Image Generation/adjustImage",
  description: "Adjust an existing image using Bun.Image. Supports converting between formats (jpeg, png, webp), scaling by a ratio, and adjusting brightness. The result is saved as a new file in the shared media library.",
  inputSchema: z.object({
    source: z.string().describe("Source image to adjust. Pass a filename (resolved relative to the media library directory) or a relative/absolute path."),
    format: z.enum(["jpeg", "png", "webp"]).describe("Output image format. Defaults to the source image's format.").exactOptional(),
    scale: z.number().positive().describe("Scale ratio to apply to width and height (e.g. 0.5 halves dimensions, 2 doubles them).").exactOptional(),
    brightness: z.number().nonnegative().describe("Brightness multiplier. 1.0 leaves brightness unchanged, <1 darkens, >1 brightens.").exactOptional(),
    quality: z.number().int().min(1).max(100).describe("Output quality (1-100) for lossy formats (jpeg, webp).").exactOptional(),
  }),
  execute: async (input, agent) => {
    // Implementation
  }
};
```

**Usage Example:**

```typescript
// Convert to JPEG and scale down
const result = await agent.useTool("image_adjust", {
  source: "abc123.png",
  format: "jpeg",
  scale: 0.5,
  quality: 85
});

console.log(result);
// {
//   path: "./media/generated/def456.jpg",
//   fileName: "def456.jpg",
//   mediaType: "image/jpeg",
//   width: 512,
//   height: 512
// }
```

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `source` | `string` | Yes | Source image filename or path |
| `format` | `"jpeg" \| "png" \| "webp"` | No | Output format. Defaults to source format |
| `scale` | `number` | No | Scale ratio (must be positive) |
| `brightness` | `number` | No | Brightness multiplier (must be non-negative) |
| `quality` | `number` | No | Quality for lossy formats (1-100) |

**Supported Formats:**

- `jpeg`: JPEG format with quality control
- `png`: PNG format (lossless)
- `webp`: WebP format with quality control

**Note:** The underlying `ImageService.adjustImage()` method additionally supports `avif` and `heic` output formats, though these are not exposed through the tool input schema.

## RPC Endpoints

The package exposes an RPC endpoint at `/rpc/image` with the following methods:

### generateImage

Generate an image via RPC and save it to the shared media library.

**Request:**

```typescript
{
  agentId: string;         // Agent ID to use for generation
  model?: string;          // Optional model override
  request: {
    prompt: string;        // Description of the image to generate
    quality: "ultra" | "high" | "standard" | "low";
    shape: "square" | "landscape" | "portrait" | "ultrawide" | "ultratall";
    keywords?: string[];   // Optional keywords for metadata
  };
}
```

**Response:**

```typescript
// Success
{
  status: "success";
  results: Array<{
    fileName: string;
    width?: number;
    height?: number;
    mediaType: string;
  }>;
}

// Error
{
  status: "agentNotFound";
}
```

**Example:**

```typescript
const result = await rpcClient.generateImage({
  agentId: "my-agent",
  request: {
    prompt: "A beautiful sunset over mountains",
    quality: "high",
    shape: "landscape",
    keywords: ["sunset", "mountains", "landscape"]
  }
});

console.log(result);
// {
//   status: "success",
//   results: [{
//     fileName: "abc123.png",
//     width: 1536,
//     height: 1024,
//     mediaType: "image/png"
//   }]
// }
```

## Core Components

### ImageService

Main service managing image generation and editing functionality.

**Service Name:** `ImageService`

**Description:** Image generation and editing backed by the shared media library

**Constructor:**

```typescript
constructor(
  app: TokenRingApp,
  options: ParsedImageGenerationConfig
)
```

**Methods:**

#### getOutputDirectory(agent)

Get the media library output directory (workspace/plugin level) via MediaLibraryService.

```typescript
getOutputDirectory(agent: Agent): string
```

**Parameters:**

- `agent`: Agent instance (used to resolve MediaLibraryService)

**Returns:** The configured media library directory path

#### getModel(agent)

Get the image generation model for a specific agent.

```typescript
getModel(agent: Agent): string | null
```

**Parameters:**

- `agent`: Agent instance

**Returns:** The agent's model or the global default, or null if neither is set

#### setModel(model, agent)

Set the image generation model for a specific agent.

```typescript
setModel(model: string | null, agent: Agent): void
```

**Parameters:**

- `model`: Model name to set (or null to clear)
- `agent`: Agent instance

#### requireModel(agent)

Get the model for an agent, throwing an error if not set.

```typescript
requireModel(agent: Agent): string
```

**Parameters:**

- `agent`: Agent instance

**Returns:** The model name

**Throws:** `ConfigurationError` if no model is configured

#### reindex(agent)

Regenerate the image index via the shared media library service.

```typescript
async reindex(agent: Agent): Promise<void>
```

**Parameters:**

- `agent`: Agent instance

**Behavior:**

Delegates to `MediaLibraryService.reindex(agent, ["image"])` to reindex all image media.

#### generateImage(options, agent)

Generate an AI image and save it with metadata.

```typescript
async generateImage(
  options: GenerateImageOptions,
  agent: Agent
): Promise<{
  mediaType: string;
  fileName: string;
  filePath: string;
  width?: number;
  height?: number;
  buffer: Buffer;
}>
```

**Parameters:**

- `options.prompt`: Description of the image to generate
- `options.sizing`: Object with `method`, `quality`, and `shape` properties
- `options.keywords`: Optional array of keywords for metadata
- `agent`: Agent instance

**Returns:** Object with mediaType, fileName, filePath, optional width/height, and buffer

**Throws:** `ConfigurationError` if no model is selected

#### adjustImage(options, agent)

Adjust an existing image using Bun.Image.

```typescript
async adjustImage(
  options: AdjustImageOptions,
  agent: Agent
): Promise<{
  mediaType: string;
  fileName: string;
  filePath: string;
  width: number;
  height: number;
  buffer: Buffer;
}>
```

**Parameters:**

- `options.source`: Source image path
- `options.format`: Optional output format (jpeg, png, webp, avif, heic)
- `options.scale`: Optional scale ratio
- `options.brightness`: Optional brightness multiplier
- `options.quality`: Optional quality for lossy formats
- `agent`: Agent instance

**Returns:** Object with mediaType, fileName, filePath, width, height, and buffer

**Throws:** Error if source file not found or unsupported output format

## State Management

The package uses `ImageState` to maintain per-agent configuration:

**State Fields:**

| Field | Type | Description |
|---|---|---|
| `model` | `string \| null` | Currently selected image generation model for the agent |

**State Commands:**

```typescript
// Get current state
const state = agent.getState(ImageState);
console.log(state.model);

// Show state
console.log(state.show());
// Output:
// Image Model: openai:dall-e-3
```

**Serialization:**

The state supports serialization and deserialization for persistence:

```typescript
// Serialize
const data = state.serialize(); // { model: "openai:dall-e-3" }

// Deserialize
state.deserialize({ model: "openai:dall-e-3" });
```

## Usage Examples

### Basic Image Generation

```typescript
// Generate a landscape image
const result = await agent.useTool("image_generate", {
  prompt: "A beautiful mountain landscape with a lake at sunset",
  quality: "high",
  shape: "landscape",
  keywords: ["landscape", "nature", "mountains", "lake", "sunset"]
});

console.log(result.path); // ./media/generated/abc123.png
```

### Adjusting an Image

```typescript
// Convert PNG to JPEG and scale down
const result = await agent.useTool("image_adjust", {
  source: "abc123.png",
  format: "jpeg",
  scale: 0.5,
  quality: 85
});

console.log(result.path); // ./media/generated/def456.jpg
```

### Rebuilding the Image Index

```typescript
// Manually rebuild the image index
await agent.runCommand("/image reindex");
```

### Complete Workflow

```typescript
// Generate an image
const generateResult = await agent.useTool("image_generate", {
  prompt: "A cozy coffee shop interior",
  quality: "ultra",
  shape: "portrait",
  keywords: ["coffee", "interior", "cozy", "cafe"]
});

// Change model for next generation
await agent.runCommand("/image model set anthropic:image-gen-v1");

// Adjust the generated image
const adjustResult = await agent.useTool("image_adjust", {
  source: generateResult.path,
  format: "webp",
  quality: 90
});
```

## Package Structure

```text
plugin/image/
├── index.ts                         # Package exports (ImageService)
├── plugin.ts                        # Plugin integration logic and configuration
├── ImageService.ts                  # Core service implementation
├── schema.ts                        # Configuration and state schemas
├── tools.ts                         # Tool exports
├── tools/
│   ├── generateImage.ts             # image_generate tool implementation
│   └── adjustImage.ts               # image_adjust tool implementation
├── commands.ts                      # Chat command exports
├── commands/
│   ├── image/reindex.ts             # /image reindex command
│   └── image/model/
│       ├── get.ts                   # /image model get command
│       ├── set.ts                   # /image model set command
│       ├── select.ts                # /image model select command
│       └── reset.ts                 # /image model reset command
├── rpc/
│   ├── imageGeneration.ts           # RPC endpoint implementation
│   └── schema.ts                    # RPC schema definitions
├── state/
│   └── ImageState.ts                # Agent state slice for image settings
├── bun.config.ts                    # Bun test configuration
├── package.json                     # Package metadata
```

## Integration

### Service Registration

The package registers the following services:

1. **ImageService**: Core image generation and editing functionality
2. **ChatService**: Registers tools for image generation and adjustment
3. **AgentCommandService**: Registers `/image` commands
4. **RpcService**: Registers `/rpc/image` endpoint

### Tool Registration

The following tools are automatically registered:

- `image_generate`: Generate AI images
- `image_adjust`: Adjust existing images (format conversion, scaling, brightness)

### Media Library Integration

All image storage and indexing is handled by `@tokenring-ai/media-library`. The ImageService delegates media writing and reindexing to the shared media library service.

## Error Handling

The package includes comprehensive error handling:

| Error | Description | Solution |
|---|---|---|
| `No image generation model is currently selected` | No model configured | Use `/image model set` or configure in plugin |
| `No default image generation model was configured` | No models available at startup | Configure `defaultModels` in plugin config |
| `Source path is required` | Missing source for adjustment | Provide a source file path |
| `Failed to read source image` | Source file not found | Verify the source file exists |
| `Unsupported output format` | Invalid format specified | Use jpeg, png, webp, avif, or heic |
| `Scale must be greater than 0` | Invalid scale value | Provide a positive scale ratio |
| `Brightness must be non-negative` | Invalid brightness value | Provide a non-negative brightness multiplier |
| `BMP output not supported` | BMP format requested | Use a supported format |
| `GIF output not supported` | GIF format requested | Use a supported format |
| `TIFF output not supported` | TIFF format requested | Use a supported format |
| `No initial image model configured` | Reset with no initial model | Configure `agentDefaults.model` in plugin config |

## Dependencies

### Production Dependencies

- `@tokenring-ai/agent` (workspace:*) - Agent orchestration system
- `@tokenring-ai/ai-client` (workspace:*) - AI client and model registry
- `@tokenring-ai/app` (workspace:*) - Application framework
- `@tokenring-ai/chat` (workspace:*) - Chat service integration
- `@tokenring-ai/filesystem` (workspace:*) - File system operations
- `@tokenring-ai/media-library` (workspace:*) - Shared media library
- `@tokenring-ai/rpc` (workspace:*) - RPC service integration
- `@tokenring-ai/utility` (workspace:*) - Utility functions
- `exiftool-vendored` (^36.1.0) - EXIF metadata processing
- `zod` (^4.4.3) - Schema validation

### Development Dependencies

- `bun test` - Testing framework
- `typescript` (^7.0.2) - TypeScript compiler

## Testing

Run tests with Bun:

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.
