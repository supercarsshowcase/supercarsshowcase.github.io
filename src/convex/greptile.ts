"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Greptile codebase assistant.
 *
 * Proxies the Greptile MCP server (https://api.greptile.com/mcp) from a
 * Convex node action so the API key stays server-side (GREPTILE_API_KEY).
 * The assistant searches the knowledge base Greptile builds for your
 * repositories and returns the matching documents with snippets.
 */

const GREPTILE_MCP_URL = "https://api.greptile.com/mcp";

interface MCPResult {
  content?: { type?: string; text?: string }[];
  isError?: boolean;
  [key: string]: unknown;
}

interface KnowledgeBase {
  repoNamespaceExternalId?: string;
  repoName?: string;
  [key: string]: unknown;
}

async function mcpCall(apiKey: string, toolName: string, toolArgs: Record<string, unknown>): Promise<MCPResult> {
  const response = await fetch(GREPTILE_MCP_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1_000_000),
      method: "tools/call",
      params: { name: toolName, arguments: toolArgs },
    }),
  });

  if (!response.ok) {
    let message = `Greptile returned HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // fall through to the generic message
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as { result?: MCPResult; error?: { message?: string } };
  if (payload?.error?.message) {
    throw new Error(payload.error.message);
  }
  return payload.result ?? {};
}

function textOf(result: MCPResult): string {
  return (result.content ?? [])
    .filter((c) => c.type === "text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n");
}

/**
 * Search the codebase. Returns the indexed repo name plus the matching
 * knowledge-base documents (path + snippet, with full body for the top hit).
 */
export const searchCodebase = action({
  args: {
    query: v.string(),
    repo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Please sign in to ask the codebase.");
    }

    const apiKey = process.env.GREPTILE_API_KEY;
    if (!apiKey) {
      throw new Error("GREPTILE_API_KEY is not configured yet.");
    }

    const query = args.query.trim();
    if (!query) {
      return { repo: null, docs: [] };
    }

    // 1. Find indexed repositories.
    const kbResult = await mcpCall(apiKey, "list_knowledge_bases", {});
    let knowledgeBases: KnowledgeBase[] = [];
    try {
      const parsed = JSON.parse(textOf(kbResult)) as KnowledgeBase[] | { repositories?: KnowledgeBase[] };
      if (Array.isArray(parsed)) knowledgeBases = parsed;
      else if (parsed && Array.isArray(parsed.repositories)) knowledgeBases = parsed.repositories;
    } catch {
      knowledgeBases = [];
    }

    if (knowledgeBases.length === 0) {
      throw new Error(
        "No repositories are indexed with Greptile yet. Install the Greptile GitHub app on your repo, then try again.",
      );
    }

    const requested = args.repo?.toLowerCase();
    const target =
      knowledgeBases.find((kb) => {
        const name = (kb.repoName ?? "").toLowerCase();
        return requested ? name.includes(requested) || requested.includes(name) : false;
      }) ?? knowledgeBases[0];

    const repoName = (target.repoName as string | undefined) ?? "your codebase";
    const externalId = target.repoNamespaceExternalId;
    if (!externalId) {
      throw new Error(`Greptile has no knowledge base handle for ${repoName}.`);
    }

    // 2. Search the knowledge base.
    const searchResult = await mcpCall(apiKey, "search_knowledge_base", {
      repoNamespaceExternalId: externalId,
      query,
      limit: 6,
    });

    interface SearchMatch {
      path?: string;
      snippet?: string;
      lineNumbers?: number[];
      [key: string]: unknown;
    }
    let matches: SearchMatch[] = [];
    try {
      const parsed = JSON.parse(textOf(searchResult)) as SearchMatch[] | { results?: SearchMatch[] };
      if (Array.isArray(parsed)) matches = parsed;
      else if (parsed && Array.isArray(parsed.results)) matches = parsed.results;
    } catch {
      matches = [];
    }

    if (matches.length === 0) {
      return { repo: repoName, docs: [] };
    }

    // 3. Pull the full body of the strongest hit.
    const topPath = matches[0]?.path;
    let topContent: string | null = null;
    if (topPath) {
      try {
        const docResult = await mcpCall(apiKey, "get_knowledge_base_document", {
          repoNamespaceExternalId: externalId,
          path: topPath,
        });
        const parsed = JSON.parse(textOf(docResult)) as { content?: string; truncated?: boolean };
        topContent = typeof parsed?.content === "string" ? parsed.content.slice(0, 4000) : null;
      } catch {
        topContent = null;
      }
    }

    return {
      repo: repoName,
      docs: matches.slice(0, 6).map((m) => ({
        path: m.path ?? "unknown",
        snippet: m.snippet ?? "",
        lineNumbers: m.lineNumbers ?? [],
      })),
      topContent,
    };
  },
});
