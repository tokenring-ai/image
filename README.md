# @tokenring-ai/image

AI-powered image generation and editing backed by the shared media library, with EXIF metadata support and local image search capabilities.

## Overview

This package provides AI-powered image generation capabilities for the Token Ring ecosystem. It integrates with the agent system to generate images based on prompts and stores generated media through `@tokenring-ai/media-library`.

## Key Features

- **AI Image Generation**: Generate images using configurable AI models (DALL-E 3, etc.)
- **EXIF Metadata**: Add keywords and descriptions to image metadata using exiftool-vendored
- **Local Image Search**: Search through generated images by keyword similarity
- **Automatic Indexing**: Uses the media library index for generated images with metadata (dimensions, keywords, MIME type)
- **Shared Media Storage**: Uses `@tokenring-ai/media-library` for output directories and static serving
- **Aspect Ratio Support**: Generate images in square (1024x1024), tall (1024x1536), or wide (1536x1024) formats
- **Model Flexibility**: Support for multiple AI image generation models through the model registry
- **Keyword-Based Similarity Search**: Implements custom similarity algorithm matching keywords from image metadata
- **RPC Endpoints**: HTTP API for image generation and retrieval
- **Web Host Integration**: Static file serving is provided by `@tokenring-ai/media-library`
- **Image Adjustment**: Convert formats, scale, and adjust brightness of existing images

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

mediaLibrary:
  agentDefaults:
    outputDirectory: "./media/generated"
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

| Field                           | Type       | Required | Description                                                                |
|---------------------------------|------------|----------|----------------------------------------------------------------------------|
| `defaultModels`                 | `string[]` | No       | List of model names to try for default selection (first available is used) |
| `agentDefaults.model`           | `string`   | No       | Default image generation model for agents                                  |

## Chat Commands

### /image reindex

Regenerate the image index by scanning all images and reading their metadata.

**Usage:**

```bash
/image reindex
```

**Behavior:**

1. Scans the output directory for image files (jpg, jpeg, png, webp)
2. Reads EXIF metadata from each file using exiftool-vendored
3. Rebuilds the index with metadata (filename, MIME type, dimensions, keywords)

**Example Output:**

```text
Reindexing images in ./images/generated...
Reindexed 15 images.
Image index re-indexed successfully.
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

Generate an AI image and save it to a configured output directory.

**Tool Definition:**

```typescript
import { TokenRingToolDefinition } from "@tokenring-ai/chat/schema";
import { z } from "zod";

const image_generate: TokenRingToolDefinition = {
  name: "image_generate",
  displayName: "Image Generation/generateImage",
  description: "Generate an AI image and save it to a configured output directory",
  inputSchema: z.object({
    prompt: z.string().describe("Description of the image to generate"),
    aspectRatio: z.enum(["square", "tall", "wide"]).default("square"),
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
  aspectRatio: "wide",
  keywords: ["landscape", "nature", "mountains", "lake", "sunset"]
});

console.log(result); // { path: "./images/generated/abc123.png" }
```

**Parameters:**

| Parameter     | Type                           | Required | Description                                 |
|---------------|--------------------------------|----------|---------------------------------------------|
| `prompt`      | `string`                       | Yes      | Description of the image to generate        |
| `aspectRatio` | `"square" \| "tall" \| "wide"` | No       | Aspect ratio. Default: "square" (1024x1024) |
| `keywords`    | `string[]`                     | No       | Keywords to add to image EXIF/IPTC metadata |

**Aspect Ratios:**

- `square`: 1024x1024
- `tall`: 1024x1536
- `wide`: 1536x1024

### image_search

Search for generated images based on keyword similarity.

**Tool Definition:**

```typescript
import { TokenRingToolDefinition } from "@tokenring-ai/chat/schema";
import { z } from "zod";

const image_search: TokenRingToolDefinition = {
  name: "image_search",
  displayName: "Image Generation/searchImages",
  description: "Search for images in the index based on keyword similarity",
  inputSchema: z.object({
    query: z.string().describe("Search query to match against image keywords"),
    limit: z.number().int().positive().default(10).describe("Maximum number of results to return").exactOptional(),
  }),
  execute: async (input, agent) => {
    // Implementation
  }
};
```

**Similarity Algorithm:**

- Exact matches receive a score of 1.0
- Partial matches (one string contains the other) receive a score of 0.8
- Word-based matching for partial matches with proportional scoring
- Results sorted by similarity score in descending order

**Usage Example:**

```typescript
// Search for sunset-related images
const searchResults = await agent.useTool("image_search", {
  query: "sunset landscape",
  limit: 3
});

console.log(searchResults);
// {
//   results: [
//     {
//       filename: "sunset_lake.png",
//       path: "./images/generated/sunset_lake.png",
//       score: 0.8,
//       mimeType: "image/png",
//       width: 1024,
//       height: 1024,
//       keywords: ["sunset", "lake", "landscape"]
//     }
//   ],
//   message: "Found 3 images matching \"sunset landscape\""
// }
```

**Parameters:**

| Parameter | Type     | Required | Description                                      |
|-----------|----------|----------|--------------------------------------------------|
| `query`   | `string` | Yes      | Search query to match against image keywords     |
| `limit`   | `number` | No       | Maximum number of results to return. Default: 10 |

**Response Schema:**

```typescript
{
  results: Array<{
    filename: string;
    path: string;
    score: number;
    mimeType: string;
    width: number;
    height: number;
    keywords: string[];
  }>;
  message: string;
}
```

### image_adjust

Adjust an existing image using Bun.Image. Supports converting between formats, scaling, and adjusting brightness.

**Tool Definition:**

```typescript
import { TokenRingToolDefinition } from "@tokenring-ai/chat/schema";
import { z } from "zod";

const image_adjust: TokenRingToolDefinition = {
  name: "image_adjust",
  displayName: "Image Generation/adjustImage",
  description: "Adjust an existing image using Bun.Image. Supports converting between formats (jpeg, png, webp, gif), scaling by a ratio, and adjusting brightness. The result is saved as a new file in the configured output directory and added to the image index.",
  inputSchema: z.object({
    source: z.string().describe("Source image to adjust. Pass a filename (resolved relative to the output directory) or a relative/absolute path."),
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
//   path: "./images/generated/def456.jpg",
//   fileName: "def456.jpg",
//   mediaType: "image/jpeg",
//   width: 512,
//   height: 512
// }
```

**Parameters:**

| Parameter   | Type                           | Required | Description                                                                 |
|-------------|--------------------------------|----------|-----------------------------------------------------------------------------|
| `source`    | `string`                       | Yes      | Source image filename or path                                               |
| `format`    | `"jpeg" \| "png" \| "webp"`    | No       | Output format. Defaults to source format                                    |
| `scale`     | `number`                       | No       | Scale ratio (must be positive)                                              |
| `brightness`| `number`                       | No       | Brightness multiplier (must be non-negative)                                |
| `quality`   | `number`                       | No       | Quality for lossy formats (1-100)                                           |

**Supported Formats:**

- `jpeg`: JPEG format with quality control
- `png`: PNG format (lossless)
- `webp`: WebP format with quality control

## RPC Endpoints

The package exposes an RPC endpoint at `/rpc/image` with the following methods:

### getImages

Retrieve a list of generated images from the index.

**Request:**

```typescript
{
  search?: string;      // Optional search term to filter by keywords or filename
  limit?: number;       // Maximum number of results (default: 200)
}
```

**Response:**

```typescript
{
  images: Array<{
    filename: string;
    mimeType: string;
    width: number;
    height: number;
    keywords: string[];
  }>;
  count: number;        // Total number of images in index
}
```

**Example:**

```typescript
// Get all images
const allImages = await rpcClient.getImages({});

// Search for sunset images
const sunsetImages = await rpcClient.getImages({ search: "sunset" });

// Get last 50 images
const recentImages = await rpcClient.getImages({ limit: 50 });
```

### generateImage

Generate an image via RPC and save it to the output directory.

**Request:**

```typescript
{
  agentId: string;      // Agent ID to use for generation
  prompt: string;       // Description of the image to generate
  model?: string;       // Optional model override
  aspectRatio?: "square" | "tall" | "wide";  // Default: "square"
  keywords?: string[];  // Optional keywords for metadata
}
```

**Response:**

```typescript
// Success
{
  status: "success";
  filename: string;
  width: number;
  height: number;
  mimeType: string;
  message: string;
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
  prompt: "A beautiful sunset over mountains",
  aspectRatio: "wide",
  keywords: ["sunset", "mountains", "landscape"]
});

console.log(result);
// {
//   status: "success",
//   filename: "abc123.png",
//   width: 1536,
//   height: 1024,
//   mimeType: "image/png",
//   message: "Generated: abc123.png"
// }
```

## Core Components

### ImageService

Main service managing image generation and indexing functionality.

**Service Name:** `ImageService`

**Description:** Image generation with configurable output directories

**Constructor:**

```typescript
constructor(
  app: TokenRingApp,
  options: ParsedImageGenerationConfig
)
```

**Methods:**

#### getDefaultOutputDirectory()

Get the configured default output directory for generated images.

```typescript
getDefaultOutputDirectory(): string
```

**Returns:** The configured output directory path

#### getOutputDirectory(agent)

Get the output directory for a specific agent (from agent state).

```typescript
getOutputDirectory(agent: Agent): string
```

**Parameters:**

- `agent`: Agent instance

**Returns:** The agent's output directory path

#### getDefaultModel()

Get the globally configured default image generation model.

```typescript
getDefaultModel(): string | null
```

**Returns:** The default model name or null if not configured

#### getModel(agent)

Get the image generation model for a specific agent.

```typescript
getModel(agent: Agent): string | null
```

**Parameters:**

- `agent`: Agent instance

**Returns:** The agent's model or null

#### setModel(model, agent)

Set the image generation model for a specific agent.

```typescript
setModel(model: string, agent: Agent): void
```

**Parameters:**

- `model`: Model name to set
- `agent`: Agent instance

#### requireModel(agent)

Get the model for an agent, throwing an error if not set.

```typescript
requireModel(agent: Agent): string
```

**Parameters:**

- `agent`: Agent instance

**Returns:** The model name

**Throws:** Error if no model is configured

#### addToIndex()

Add an image entry to the index with metadata.

```typescript
async addToIndex(
  directory: string,
  filename: string,
  mimeType: string,
  width: number,
  height: number,
  keywords: string[],
  agent: Agent
): Promise<void>
```

**Parameters:**

- `directory`: Output directory path
- `filename`: Image filename
- `mimeType`: Image MIME type
- `width`: Image width in pixels
- `height`: Image height in pixels
- `keywords`: Array of keywords to add to metadata
- `agent`: Agent instance for file operations

#### reindex()

Regenerate the image index from existing files in the output directory.

```typescript
async reindex(agent: Agent): Promise<void>
```

**Parameters:**

- `agent`: Agent instance for file operations

**Behavior:**

- Scans directory for image files (jpg, jpeg, png, webp)
- Reads EXIF metadata from each file
- Updates image_index.json with metadata entries
- Logs progress and errors

#### generateImage()

Generate an AI image and save it with metadata.

```typescript
async generateImage(
  options: GenerateImageOptions,
  agent: Agent
): Promise<{
  mediaType: string;
  fileName: string;
  filePath: string;
  buffer: Buffer;
}>
```

**Parameters:**

- `options.prompt`: Description of the image to generate
- `options.aspectRatio`: "square", "tall", or "wide" (default: "square")
- `options.keywords`: Optional array of keywords for metadata
- `agent`: Agent instance

**Returns:** Object with mediaType, fileName, filePath, and buffer

**Throws:** Error if no model is selected or prompt is missing

#### adjustImage()

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
- `options.format`: Optional output format (jpeg, png, webp)
- `options.scale`: Optional scale ratio
- `options.brightness`: Optional brightness multiplier
- `options.quality`: Optional quality for lossy formats
- `agent`: Agent instance

**Returns:** Object with mediaType, fileName, filePath, width, height, and buffer

**Throws:** Error if source path is required or format is unsupported

## State Management

The package uses `ImageGenerationState` to maintain per-agent configuration:

**State Fields:**

| Field             | Type             | Description                                             |
|-------------------|------------------|---------------------------------------------------------|
| `model`           | `string \| null` | Currently selected image generation model for the agent |
| `outputDirectory` | `string`         | Output directory for generated images                   |

**State Commands:**

```typescript
// Get current state
const state = agent.getState(ImageGenerationState);
console.log(state.model);
console.log(state.outputDirectory);

// Show state
console.log(state.show());
// Output:
// Image Model: openai:dall-e-3
// Output Directory: ./images/generated
```

## Usage Examples

### Basic Image Generation

```typescript
// Generate a landscape image
const result = await agent.useTool("image_generate", {
  prompt: "A beautiful mountain landscape with a lake at sunset",
  aspectRatio: "wide",
  keywords: ["landscape", "nature", "mountains", "lake", "sunset"]
});

console.log(result.path); // ./images/generated/abc123.png
```

### Searching Generated Images

```typescript
// Search for sunset-related images
const searchResults = await agent.useTool("image_search", {
  query: "sunset landscape",
  limit: 3
});

for (const image of searchResults.results) {
  console.log(`${image.filename} (score: ${image.score})`);
  console.log(`  Keywords: ${image.keywords.join(", ")}`);
  console.log(`  Dimensions: ${image.width}x${image.height}`);
}
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

console.log(result.path); // ./images/generated/def456.jpg
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
  aspectRatio: "tall",
  keywords: ["coffee", "interior", "cozy", "cafe"]
});

// Search for it later
const searchResult = await agent.useTool("image_search", {
  query: "coffee cafe interior",
  limit: 5
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
pkg/image/
├── index.ts                         # Package exports (ImageService)
├── plugin.ts                        # Plugin integration logic and configuration
├── ImageService.ts        # Core service implementation
├── schema.ts                        # Configuration and state schemas
├── tools.ts                         # Tool exports
├── tools/
│   ├── generateImage.ts             # image_generate tool implementation
│   ├── searchImages.ts              # image_search tool implementation
│   └── adjustImage.ts               # image_adjust tool implementation
├── commands.ts                      # Chat command exports
├── commands/
│   ├── image.ts                     # /image reindex command
│   └── model/
│       ├── get.ts                   # /image model get command
│       ├── set.ts                   # /image model set command
│       ├── select.ts                # /image model select command
│       └── reset.ts                 # /image model reset command
├── rpc/
│   ├── imageGeneration.ts           # RPC endpoint implementation
│   └── schema.ts                    # RPC schema definitions
├── state/
│   └── ImageGenerationState.ts      # Agent state slice for image settings
├── package.json                     # Package metadata
└── vitest.config.ts                 # Test configuration
```

## Integration

### Service Registration

The package registers the following services:

1. **ImageService**: Core image generation and indexing functionality
2. **ChatService**: Registers tools for image generation, search, and adjustment
3. **AgentCommandService**: Registers `/image` commands
4. **RpcService**: Registers `/rpc/image` endpoint
5. **WebHostService**: Registers `/api/media` static file serving

### Tool Registration

The following tools are automatically registered:

- `image_generate`: Generate AI images
- `image_search`: Search generated images by keyword similarity
- `image_adjust`: Adjust existing images (format conversion, scaling, brightness)

### Web Host Integration

The package registers a static file resource for media files:

- **Resource Name**: "Image Media Files"
- **Endpoint**: `/api/media`
- **Directory**: Configured `outputDirectory`

This allows generated images to be served via HTTP:

```text
GET /api/media/abc123.png  -> Returns the image file
```

## Error Handling

The package includes comprehensive error handling:

| Error                                              | Description                    | Solution                                      |
|----------------------------------------------------|--------------------------------|-----------------------------------------------|
| `Prompt is required`                               | Missing prompt parameter       | Provide a prompt string                       |
| `No index found at {path}`                         | Index file doesn't exist       | Run `/image reindex` first                    |
| `Failed to read metadata for {file}`               | EXIF read error                | Non-fatal, continues processing other files   |
| `Failed to write EXIF data`                        | EXIF write error               | Non-fatal, image still saved                  |
| `No image generation model is currently selected`  | No model configured            | Use `/image model set` or configure in plugin |
| `No default image generation model was configured` | No models available at startup | Configure `defaultModels` in plugin config    |
| `Source path is required`                          | Missing source for adjustment  | Provide a source file path                    |
| `Failed to read source image`                      | Source file not found          | Verify the source file exists                 |
| `Unsupported output format`                        | Invalid format specified       | Use jpeg, png, or webp                        |
| `Scale must be greater than 0`                     | Invalid scale value            | Provide a positive scale ratio                |
| `Brightness must be non-negative`                  | Invalid brightness value       | Provide a non-negative brightness multiplier  |

## Performance Considerations

- **Efficient Indexing**: Optimized metadata reading and index building
- **Similarity Search**: Simple keyword-based scoring with early termination
- **Memory Management**: Proper resource cleanup for file operations
- **Index Format**: Line-delimited JSON for efficient appending
- **Batch Processing**: Index rebuilding processes files in batches
- **Metadata Caching**: EXIF metadata read once per file during indexing

## Dependencies

### Production Dependencies

- `@tokenring-ai/agent` (0.2.0) - Agent orchestration system
- `@tokenring-ai/ai-client` (0.2.0) - AI client and model registry
- `@tokenring-ai/app` (0.2.0) - Application framework
- `@tokenring-ai/chat` (0.2.0) - Chat service integration
- `@tokenring-ai/filesystem` (0.2.0) - File system operations
- `@tokenring-ai/rpc` (0.2.0) - RPC service integration
- `@tokenring-ai/utility` (0.2.0) - Utility functions
- `@tokenring-ai/web-host` (0.2.0) - Web server integration
- `exiftool-vendored` (^35.15.1) - EXIF metadata processing
- `uuid` (14.0.0) - Unique ID generation
- `zod` (^4.3.6) - Schema validation

### Development Dependencies

- `vitest` (^4.1.1) - Testing framework
- `typescript` (^6.0.2) - TypeScript compiler

## Testing

Run tests with Vitest:

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
