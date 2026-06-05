import type { ArtifactKind } from "@/components/artifact";
import type { AgentFile } from "@/lib/db/schema";

const defaultCreateDocumentGuidance = `**When to use \`createDocument\`:**
- When the user specifically asks for a document or artifact.

**When NOT to use \`createDocument\`:**
- Except when the user specifically asked for a document or artifact.`;

export const buildArtifactsPrompt = (
  customCreateDocumentPrompt?: string | null
) => {
  const createDocumentGuidance =
    customCreateDocumentPrompt || defaultCreateDocumentGuidance;

  return `
Artifacts is a special user interface mode that helps users with writing, editing, and other content creation tasks. When artifact is open, it is on the right side of the screen, while the conversation is on the left side. When creating or updating documents, changes are reflected in real-time on the artifacts and visible to the user.

DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM. WAIT FOR USER FEEDBACK OR REQUEST TO UPDATE IT.

This is a guide for using artifacts tools: \`createDocument\` and \`updateDocument\`, which render content on a artifacts beside the conversation.

${createDocumentGuidance}

**Using \`updateDocument\`:**
- Default to full document rewrites for major changes
- Use targeted updates only for specific, isolated changes
- Follow user instructions for which parts to modify

**When NOT to use \`updateDocument\`:**
- Immediately after creating a document

Do not update document right after creating it. Wait for user feedback or request to update it.
`;
};

export const artifactsPrompt = buildArtifactsPrompt();

const formatAgentFilesForPrompt = (files: AgentFile[]): string => {
  if (!files || files.length === 0) {
    return "";
  }

  let result =
    "\n\n<knowledge_base>\nThe following files contain additional context and reference information.\n\n";
  for (const file of files) {
    result += `<file name="${file.name}">\n${file.content}\n</file>\n\n`;
  }
  result += "</knowledge_base>";
  return result;
};

export const systemPrompt = ({
  selectedChatModel,
  agentSystemPrompt,
  agentFiles,
  documentToolsEnabled = true,
  documentToolsPrompt,
}: {
  selectedChatModel: string;
  agentSystemPrompt: string;
  agentFiles?: AgentFile[];
  documentToolsEnabled?: boolean;
  documentToolsPrompt?: string | null;
}) => {
  const filesPrompt = formatAgentFilesForPrompt(agentFiles || []);

  // reasoning models don't need artifacts prompt (they can't use tools)
  if (
    selectedChatModel.includes("reasoning") ||
    selectedChatModel.includes("thinking")
  ) {
    return `${agentSystemPrompt}${filesPrompt}`;
  }

  // Skip artifacts prompt if document tools are disabled
  if (!documentToolsEnabled) {
    return `${agentSystemPrompt}${filesPrompt}`;
  }

  const artifactsSection = buildArtifactsPrompt(documentToolsPrompt);
  return `${agentSystemPrompt}${filesPrompt}\n\n${artifactsSection}`;
};

export const codePrompt = `
You are a Python code generator that creates self-contained, executable code snippets. When writing code:

1. Each snippet should be complete and runnable on its own
2. Prefer using print() statements to display outputs
3. Include helpful comments explaining the code
4. Keep snippets concise (generally under 15 lines)
5. Avoid external dependencies - use Python standard library
6. Handle potential errors gracefully
7. Return meaningful output that demonstrates the code's functionality
8. Don't use input() or other interactive functions
9. Don't access files or network resources
10. Don't use infinite loops

Examples of good snippets:

# Calculate factorial iteratively
def factorial(n):
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

print(f"Factorial of 5 is: {factorial(5)}")
`;

export const sheetPrompt = `
You are a spreadsheet creation assistant. Create a spreadsheet in csv format based on the given prompt. The spreadsheet should contain meaningful column headers and data.
`;

export const updateDocumentPrompt = (
  currentContent: string | null,
  type: ArtifactKind
) => {
  let mediaType = "document";

  if (type === "code") {
    mediaType = "code snippet";
  } else if (type === "sheet") {
    mediaType = "spreadsheet";
  }

  return `Improve the following contents of the ${mediaType} based on the given prompt.

${currentContent}`;
};

export const titlePrompt = `Generate a short chat title (2-5 words) summarizing the user's message.

Output ONLY the title text. No prefixes, no formatting.

Examples:
- "what's the weather in nyc" → Weather in NYC
- "help me write an essay about space" → Space Essay Help
- "hi" → New Conversation
- "debug my python code" → Python Debugging

Bad outputs (never do this):
- "# Space Essay" (no hashtags)
- "Title: Weather" (no prefixes)
- ""NYC Weather"" (no quotes)`;
