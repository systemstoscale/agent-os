import { tool } from "ai";
import { z } from "zod";
import type { AgentTool, AgentToolParameter } from "@/lib/db/schema";

const DEFAULT_TIMEOUT_SECONDS = 30;

function buildZodSchema(parameters: AgentToolParameter[]) {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  for (const param of parameters) {
    let zodType: z.ZodTypeAny;

    switch (param.type) {
      case "number":
        zodType = z.number().describe(param.description);
        break;
      case "boolean":
        zodType = z.boolean().describe(param.description);
        break;
      default:
        zodType = z.string().describe(param.description);
        break;
    }

    schemaShape[param.name] = param.required ? zodType : zodType.optional();
  }

  return z.object(schemaShape);
}

async function executeWebhook(
  agentTool: AgentTool,
  aiParams: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const timeoutSeconds = agentTool.timeout ?? DEFAULT_TIMEOUT_SECONDS;
  const timeoutMs = timeoutSeconds * 1000;

  console.log(
    `[executeWebhook] Starting webhook call for tool: ${agentTool.name}`
  );
  console.log(`[executeWebhook] URL: ${agentTool.url}`);
  console.log(`[executeWebhook] Method: ${agentTool.method}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const allParams = {
      ...agentTool.staticValues,
      ...aiParams,
    };

    console.log(
      `[executeWebhook] Params:\n${JSON.stringify(allParams, null, 2)}`
    );

    let url = agentTool.url;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...agentTool.headers,
    };

    let body: string | undefined;

    if (agentTool.method === "GET") {
      const urlObj = new URL(url);
      for (const [key, value] of Object.entries(allParams)) {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.append(key, String(value));
        }
      }
      url = urlObj.toString();
    } else {
      body = JSON.stringify(allParams);
    }

    const response = await fetch(url, {
      method: agentTool.method,
      headers,
      body,
      signal: controller.signal,
    });

    console.log(`[executeWebhook] Response status: ${response.status}`);

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned status ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { success: true, data };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: `Webhook timed out after ${timeoutSeconds} seconds`,
        };
      }
      return {
        success: false,
        error: `Webhook request failed: ${error.message}`,
      };
    }

    return {
      success: false,
      error: "An unknown error occurred while calling the webhook",
    };
  }
}

export function buildWebhookTools(
  agentTools: AgentTool[]
): Record<string, unknown> {
  const tools: Record<string, unknown> = {};

  console.log(
    `[buildWebhookTools] Building tools for ${agentTools.length} agent tools`
  );

  for (const agentTool of agentTools) {
    if (!agentTool.isEnabled) {
      continue;
    }

    const toolName = agentTool.name
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    if (!toolName) {
      continue;
    }

    const inputSchema = buildZodSchema(agentTool.aiParameters || []);

    tools[toolName] = tool({
      description: agentTool.description,
      inputSchema,
      needsApproval: agentTool.requiresApproval ?? true,
      execute: async (input) => {
        return executeWebhook(agentTool, input as Record<string, unknown>);
      },
    });
  }

  console.log(
    `[buildWebhookTools] Built ${Object.keys(tools).length} tools:`,
    Object.keys(tools)
  );

  return tools;
}

export function getWebhookToolNames(agentTools: AgentTool[]): string[] {
  return agentTools
    .filter((t) => t.isEnabled)
    .map((t) =>
      t.name
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
    )
    .filter(Boolean);
}
