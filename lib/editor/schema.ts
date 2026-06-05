import { schema as baseSchema } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec } from "prosemirror-model";
import { Schema } from "prosemirror-model";

// Minimal table nodes for rendering (not editing)
const tableNodes: Record<string, NodeSpec> = {
  table: {
    content: "table_row+",
    tableRole: "table",
    group: "block",
    parseDOM: [{ tag: "table" }],
    toDOM: () => ["table", { class: "prose-table" }, ["tbody", 0]],
  },
  table_row: {
    content: "(table_cell | table_header)*",
    tableRole: "row",
    parseDOM: [{ tag: "tr" }],
    toDOM: () => ["tr", 0],
  },
  table_header: {
    content: "inline*",
    tableRole: "header_cell",
    attrs: { alignment: { default: null } },
    parseDOM: [
      {
        tag: "th",
        getAttrs: (dom) => ({
          alignment: (dom as HTMLElement).style.textAlign || null,
        }),
      },
    ],
    toDOM: (node) => [
      "th",
      node.attrs.alignment
        ? { style: `text-align: ${node.attrs.alignment}` }
        : {},
      0,
    ],
  },
  table_cell: {
    content: "inline*",
    tableRole: "cell",
    attrs: { alignment: { default: null } },
    parseDOM: [
      {
        tag: "td",
        getAttrs: (dom) => ({
          alignment: (dom as HTMLElement).style.textAlign || null,
        }),
      },
    ],
    toDOM: (node) => [
      "td",
      node.attrs.alignment
        ? { style: `text-align: ${node.attrs.alignment}` }
        : {},
      0,
    ],
  },
};

const extraMarks: Record<string, MarkSpec> = {
  strikethrough: {
    parseDOM: [{ tag: "s" }, { tag: "del" }, { tag: "strike" }],
    toDOM: () => ["s", 0],
  },
};

export const documentSchema = new Schema({
  nodes: baseSchema.spec.nodes.append(tableNodes),
  marks: baseSchema.spec.marks.append(extraMarks),
});
