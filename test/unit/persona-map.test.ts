import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

interface PersonaMap {
  readonly map: Readonly<Record<string, readonly string[]>>;
  readonly retired: Readonly<Record<string, string>>;
}

interface PanelConfig {
  readonly personas: {
    readonly defaultPanel: string;
    readonly panels: Readonly<Record<string, readonly string[]>>;
  };
}

interface DimensionsFile {
  readonly dimensions: readonly {
    readonly id: string;
    readonly personaIds: readonly string[];
  }[];
  readonly panels?: unknown;
  readonly defaultPanel?: unknown;
}

const HCD_TAGS = [
  "github_open_source_contributor",
  "maintainer",
  "platform_operator",
  "security_compliance_responder",
];

// The two persona systems (HCD Gherkin tags and OptimizeXP review personas)
// must stay reconciled: total mapping, no orphans, panels only in config.json.
export function runPersonaMapTests(): void {
  const root = process.cwd();
  // SAFETY: Runtime checks or construction above establish the asserted type.
  const personaMap = JSON.parse(
    readFileSync(join(root, ".optimizexp/persona-map.json"), "utf8"),
  ) as PersonaMap;
  // SAFETY: Runtime checks or construction above establish the asserted type.
  const config = JSON.parse(
    readFileSync(
      join(root, "packages/Epoch.Community.Web/.optimizexp/config.json"),
      "utf8",
    ),
  ) as PanelConfig;
  // SAFETY: Runtime checks or construction above establish the asserted type.
  const dimensions = JSON.parse(
    readFileSync(
      join(root, ".optimizexp/competitive/community-web-dimensions.json"),
      "utf8",
    ),
  ) as DimensionsFile;
  const personaFiles = readdirSync(join(root, ".optimizexp/personas"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/u, ""));

  everyHcdTagHasAtLeastOnePersona(personaMap);
  everyPersonaMapsToExactlyOneTag(personaMap, personaFiles);
  retiredPersonasStayRetired(personaMap, personaFiles);
  defaultPanelCoversContributorAndMaintainer(personaMap, config);
  panelPersonasExist(config, personaFiles);
  dimensionOwnersComeFromPanels(config, dimensions);
  dimensionsFileHoldsNoPanelBlock(dimensions);

  console.log("persona map tests passed");
}

function everyHcdTagHasAtLeastOnePersona(personaMap: PersonaMap): void {
  for (const tag of HCD_TAGS) {
    const personas = personaMap.map[tag] ?? [];
    assert.ok(personas.length > 0, `HCD tag ${tag} has no optimizexp personas`);
  }
  for (const tag of Object.keys(personaMap.map)) {
    assert.ok(HCD_TAGS.includes(tag), `unknown HCD tag in persona-map: ${tag}`);
  }
}

function everyPersonaMapsToExactlyOneTag(
  personaMap: PersonaMap,
  personaFiles: readonly string[],
): void {
  const mapped = Object.values(personaMap.map).flat();
  const seen = new Set<string>();
  for (const persona of mapped) {
    assert.ok(!seen.has(persona), `persona mapped to more than one HCD tag: ${persona}`);
    seen.add(persona);
    assert.ok(
      personaFiles.includes(persona),
      `persona-map references missing persona file: ${persona}`,
    );
  }
  for (const persona of personaFiles) {
    assert.ok(seen.has(persona), `persona file not mapped to any HCD tag: ${persona}`);
  }
}

function retiredPersonasStayRetired(
  personaMap: PersonaMap,
  personaFiles: readonly string[],
): void {
  for (const persona of Object.keys(personaMap.retired)) {
    assert.ok(
      !personaFiles.includes(persona),
      `retired persona still has a file: ${persona}`,
    );
  }
}

function defaultPanelCoversContributorAndMaintainer(
  personaMap: PersonaMap,
  config: PanelConfig,
): void {
  const defaultPanel = config.personas.panels[config.personas.defaultPanel];
  assert.ok(defaultPanel !== undefined, "defaultPanel not found in panels");
  for (const tag of ["github_open_source_contributor", "maintainer"]) {
    const personas = personaMap.map[tag] ?? [];
    assert.ok(
      defaultPanel.some((persona) => personas.includes(persona)),
      `default panel covers no persona for HCD tag ${tag}`,
    );
  }
}

function panelPersonasExist(
  config: PanelConfig,
  personaFiles: readonly string[],
): void {
  for (const [panel, personas] of Object.entries(config.personas.panels)) {
    for (const persona of personas) {
      assert.ok(
        personaFiles.includes(persona),
        `panel ${panel} references missing persona: ${persona}`,
      );
    }
  }
}

function dimensionOwnersComeFromPanels(
  config: PanelConfig,
  dimensions: DimensionsFile,
): void {
  const panelUnion = new Set(Object.values(config.personas.panels).flat());
  for (const dimension of dimensions.dimensions) {
    assert.ok(dimension.personaIds.length > 0, `dimension ${dimension.id} has no owners`);
    for (const persona of dimension.personaIds) {
      assert.ok(
        panelUnion.has(persona),
        `dimension ${dimension.id} owner ${persona} is in no configured panel`,
      );
    }
  }
}

function dimensionsFileHoldsNoPanelBlock(dimensions: DimensionsFile): void {
  assert.equal(
    dimensions.panels,
    undefined,
    "dimensions JSON must not duplicate the panels block (config.json is the single source)",
  );
  assert.equal(dimensions.defaultPanel, undefined, "dimensions JSON must not set defaultPanel");
}
