/*
 * Evaluate an MDX component's JSX attributes into a plain props object, so the
 * preview (and later the block editor) can render the real component instead
 * of a placeholder. Only LITERAL expressions are evaluated (arrays, objects,
 * strings, numbers, booleans, null, negative numbers) plus the one dynamic
 * shape the notes use — `frontmatter.<field>` — resolved against the note's
 * own frontmatter. Anything else throws, and the caller falls back to a
 * placeholder frame rather than guessing.
 */

interface EstreeNode {
  type: string;
  value?: unknown;
  elements?: (EstreeNode | null)[];
  properties?: { type: string; key: EstreeNode; value: EstreeNode }[];
  name?: string;
  operator?: string;
  argument?: EstreeNode;
  object?: EstreeNode;
  property?: EstreeNode;
  expressions?: EstreeNode[];
  quasis?: { value: { cooked: string } }[];
}

interface MdxAttribute {
  type: string;
  name?: string;
  value?: string | null | { data?: { estree?: { body: { expression: EstreeNode }[] } } };
}

interface MdxJsxNode {
  name?: string | null;
  attributes?: MdxAttribute[];
}

function evalNode(node: EstreeNode, fm: Record<string, unknown>): unknown {
  switch (node.type) {
    case "Literal":
      return node.value;
    case "ArrayExpression":
      return (node.elements ?? []).map((el) => (el == null ? null : evalNode(el, fm)));
    case "ObjectExpression": {
      const obj: Record<string, unknown> = {};
      for (const prop of node.properties ?? []) {
        if (prop.type !== "Property") throw new Error("unsupported object property");
        const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.value;
        obj[String(key)] = evalNode(prop.value, fm);
      }
      return obj;
    }
    case "UnaryExpression": {
      const v = evalNode(node.argument as EstreeNode, fm) as number;
      if (node.operator === "-") return -v;
      if (node.operator === "+") return +v;
      if (node.operator === "!") return !v;
      throw new Error(`unsupported unary ${node.operator}`);
    }
    case "Identifier":
      if (node.name === "undefined") return undefined;
      if (node.name === "NaN") return NaN;
      if (node.name === "Infinity") return Infinity;
      throw new Error(`unsupported identifier ${node.name}`);
    case "MemberExpression":
      if (
        node.object?.type === "Identifier" &&
        node.object.name === "frontmatter" &&
        node.property?.type === "Identifier"
      ) {
        return fm[node.property.name as string];
      }
      throw new Error("unsupported member expression");
    case "TemplateLiteral":
      if ((node.expressions ?? []).length === 0) {
        return (node.quasis ?? []).map((q) => q.value.cooked).join("");
      }
      throw new Error("template literal with expressions");
    default:
      throw new Error(`unsupported expression ${node.type}`);
  }
}

/** Read a JSX element's props, or throw if any attribute isn't literal-evaluable. */
export function readProps(node: MdxJsxNode, frontmatter: Record<string, unknown> = {}): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type !== "mdxJsxAttribute" || !attr.name) throw new Error("spread/unsupported attribute");
    const value = attr.value;
    if (value == null) {
      props[attr.name] = true; // bare `open` → true
      continue;
    }
    if (typeof value === "string") {
      props[attr.name] = value;
      continue;
    }
    const estree = value.data?.estree;
    if (!estree?.body?.[0]) throw new Error("attribute expression missing estree");
    props[attr.name] = evalNode(estree.body[0].expression, frontmatter);
  }
  return props;
}
