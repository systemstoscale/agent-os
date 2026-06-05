import type {
  LanguageModelV3GenerateResult,
  LanguageModelV3StreamResult,
} from "@ai-sdk/provider";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { getResponseChunksByPrompt } from "@/tests/prompts/utils";

const mockUsage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

const mockGenerate = (text: string) =>
  (async () => ({
    finishReason: "stop" as const,
    usage: mockUsage,
    content: [{ type: "text" as const, text }],
    warnings: [],
  })) as unknown as () => Promise<LanguageModelV3GenerateResult>;

export const chatModel = new MockLanguageModelV3({
  doGenerate: mockGenerate("Hello, world!"),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});

export const reasoningModel = new MockLanguageModelV3({
  doGenerate: mockGenerate("Hello, world!"),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: getResponseChunksByPrompt(prompt, true),
    }),
  }),
});

export const titleModel = new MockLanguageModelV3({
  doGenerate: mockGenerate("This is a test title"),
  doStream: (async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 500,
      initialDelayInMs: 1000,
      chunks: [
        { id: "1", type: "text-start" as const },
        {
          id: "1",
          type: "text-delta" as const,
          delta: "This is a test title",
        },
        { id: "1", type: "text-end" as const },
        {
          type: "finish" as const,
          finishReason: "stop" as const,
          usage: mockUsage,
        },
      ],
    }),
  })) as unknown as () => Promise<LanguageModelV3StreamResult>,
});

export const artifactModel = new MockLanguageModelV3({
  doGenerate: mockGenerate("Hello, world!"),
  doStream: async ({ prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});
