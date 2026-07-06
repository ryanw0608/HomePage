/*
 * MDX component barrel. Both [slug] pages pass this map to <Content>, so
 * notes can use every component with zero imports — write <Tldr>…</Tldr>
 * directly in any .mdx file.
 */
import Bench from "./Bench.astro";
import Callout from "./Callout.astro";
import Critique from "./Critique.astro";
import Derivation from "./Derivation.astro";
import Figure from "./Figure.astro";
import FormulaCard from "./FormulaCard.astro";
import KeyTakeaways from "./KeyTakeaways.astro";
import Recall from "./Recall.astro";
import Tldr from "./Tldr.astro";
import Verdict from "./Verdict.astro";
import WhenMatrix from "./WhenMatrix.astro";

export const mdxComponents = {
  Bench,
  Callout,
  Critique,
  Derivation,
  Figure,
  FormulaCard,
  KeyTakeaways,
  Recall,
  Tldr,
  Verdict,
  WhenMatrix
};
