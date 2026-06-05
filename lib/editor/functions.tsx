import MarkdownIt from "markdown-it";
import {
  defaultMarkdownSerializer,
  MarkdownParser,
  MarkdownSerializer,
} from "prosemirror-markdown";
import type { Node } from "prosemirror-model";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

import { documentSchema } from "./schema";
import { createSuggestionWidget, type UISuggestion } from "./suggestions";

// "default" preset includes GFM tables (unlike "commonmark" which prosemirror-markdown uses)
const md = new MarkdownIt("default", { html: false });

const markdownParser = new MarkdownParser(documentSchema, md, {
  blockquote: { block: "blockquote" },
  paragraph: { block: "paragraph" },
  list_item: { block: "list_item" },
  bullet_list: { block: "bullet_list" },
  ordered_list: {
    block: "ordered_list",
    getAttrs: (tok) => ({ order: +(tok.attrGet("start") ?? 1) }),
  },
  heading: {
    block: "heading",
    getAttrs: (tok) => ({ level: +tok.tag.slice(1) }),
  },
  code_block: { block: "code_block", noCloseToken: true },
  fence: {
    block: "code_block",
    getAttrs: (tok) => ({ params: tok.info || "" }),
    noCloseToken: true,
  },
  hr: { node: "horizontal_rule" },
  image: {
    node: "image",
    getAttrs: (tok) => ({
      src: tok.attrGet("src"),
      title: tok.attrGet("title") || null,
      alt: tok.children?.[0]?.content || null,
    }),
  },
  hardbreak: { node: "hard_break" },
  // Table tokens
  table: { block: "table" },
  thead: { ignore: true },
  tbody: { ignore: true },
  tr: { block: "table_row" },
  th: {
    block: "table_header",
    getAttrs: (tok) => ({
      alignment: tok.attrGet("style")?.match(/text-align:(\w+)/)?.[1] || null,
    }),
  },
  td: {
    block: "table_cell",
    getAttrs: (tok) => ({
      alignment: tok.attrGet("style")?.match(/text-align:(\w+)/)?.[1] || null,
    }),
  },
  // Marks
  em: { mark: "em" },
  strong: { mark: "strong" },
  s: { mark: "strikethrough" },
  link: {
    mark: "link",
    getAttrs: (tok) => ({
      href: tok.attrGet("href"),
      title: tok.attrGet("title") || null,
    }),
  },
  code_inline: { mark: "code" },
});

// Helper to collect children from a ProseMirror node
const collectChildren = (node: Node): Node[] => {
  const children: Node[] = [];
  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    children.push(child);
  }
  return children;
};

// Custom markdown serializer with table support
const markdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
    table: (state, node) => {
      const rows = collectChildren(node);
      if (rows.length === 0) {
        return;
      }

      // Get column count and alignments from first row
      const headerCells = collectChildren(rows[0]);
      const colCount = headerCells.length;
      const alignments = headerCells.map(
        (cell) => (cell.attrs.alignment as string | null) || null
      );

      // Render header row
      state.write("| ");
      for (let i = 0; i < headerCells.length; i++) {
        if (i > 0) {
          state.write(" | ");
        }
        state.renderInline(headerCells[i]);
      }
      state.write(" |\n");

      // Render separator row with alignment
      state.write("|");
      for (let i = 0; i < colCount; i++) {
        const align = alignments[i];
        if (align === "left") {
          state.write(":---");
        } else if (align === "right") {
          state.write("---:");
        } else if (align === "center") {
          state.write(":---:");
        } else {
          state.write("---");
        }
        state.write("|");
      }
      state.write("\n");

      // Render body rows
      for (let i = 1; i < rows.length; i++) {
        const cells = collectChildren(rows[i]);
        state.write("| ");
        for (let j = 0; j < cells.length; j++) {
          if (j > 0) {
            state.write(" | ");
          }
          state.renderInline(cells[j]);
        }
        state.write(" |\n");
      }
      state.closeBlock(node);
    },
    table_row: () => {
      // Handled by table serializer
    },
    table_header: () => {
      // Handled by table serializer
    },
    table_cell: () => {
      // Handled by table serializer
    },
  },
  {
    ...defaultMarkdownSerializer.marks,
    strikethrough: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  }
);

export const buildDocumentFromContent = (content: string) => {
  return markdownParser.parse(content);
};

export const buildContentFromDocument = (document: Node) => {
  return markdownSerializer.serialize(document);
};

export const createDecorations = (
  suggestions: UISuggestion[],
  view: EditorView
) => {
  const decorations: Decoration[] = [];

  for (const suggestion of suggestions) {
    decorations.push(
      Decoration.inline(
        suggestion.selectionStart,
        suggestion.selectionEnd,
        {
          class: "suggestion-highlight",
        },
        {
          suggestionId: suggestion.id,
          type: "highlight",
        }
      )
    );

    decorations.push(
      Decoration.widget(
        suggestion.selectionStart,
        (currentView) => {
          const { dom } = createSuggestionWidget(suggestion, currentView);
          return dom;
        },
        {
          suggestionId: suggestion.id,
          type: "widget",
        }
      )
    );
  }

  return DecorationSet.create(view.state.doc, decorations);
};
