#!/usr/bin/env node
/*
 * Regenerate the enum option lists in public/admin/config.yml from
 * src/data/taxonomy.ts, so the CMS selects never drift from the zod schema.
 *
 *   npm run gen:cms
 *
 * Replaces the blocks between `# BEGIN gen:cms <name>` / `# END gen:cms`
 * markers. Zero dependencies: taxonomy.ts keys are extracted textually from
 * each exported const block (the file is a curated, simple record).
 */
import { readFileSync, writeFileSync } from "node:fs";

const taxonomy = readFileSync("src/data/taxonomy.ts", "utf8");

function extractKeys(exportName) {
  const match = taxonomy.match(new RegExp(`export const ${exportName} = \\{([\\s\\S]*?)\\n\\}`, "m"));
  if (!match) throw new Error(`could not find export const ${exportName} in taxonomy.ts`);
  const keys = [...match[1].matchAll(/^\s{2}(?:"([^"]+)"|([a-zA-Z0-9-]+)):\s*\{/gm)].map(
    (m) => m[1] ?? m[2]
  );
  if (keys.length === 0) throw new Error(`no keys extracted for ${exportName}`);
  return keys;
}

const areas = extractKeys("areas");
const courses = extractKeys("courses");
const tags = extractKeys("tags");

const blocks = {
  area: `      - { name: area, label: Area, widget: select, options: [${areas.join(", ")}] }`,
  areas: `      - name: areas
        label: Areas
        widget: list
        required: false
        field: { name: area, label: Area, widget: select, options: [${areas.join(", ")}] }`,
  course: `      - { name: course, label: Course, widget: select, options: [${courses.join(", ")}] }`,
  tags: `      - name: tags
        label: Tags
        widget: list
        field: { name: tag, label: Tag, widget: select, options: [${tags.join(", ")}] }`
};

const configPath = "public/admin/config.yml";
let config = readFileSync(configPath, "utf8");
let replaced = 0;

config = config.replace(
  /(# BEGIN gen:cms (area|areas|course|tags)\n)([\s\S]*?)(\n\s*# END gen:cms)/g,
  (_, begin, name, _body, end) => {
    replaced += 1;
    return `${begin}${blocks[name]}${end}`;
  }
);

writeFileSync(configPath, config, "utf8");
console.log(`gen:cms updated ${replaced} option block(s) in ${configPath}`);
console.log(`  areas: ${areas.length} · courses: ${courses.length} · tags: ${tags.length}`);
