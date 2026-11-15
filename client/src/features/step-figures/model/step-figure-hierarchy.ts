import type { StepFigureDefinition } from "../../../types";

const normalizeText = (value: string) => value.trim().toLowerCase();

export interface FigureIndex {
  idByName: Map<string, number>;
  nameById: Map<number, string>;
}

export const buildFigureIndex = (stepFigures: StepFigureDefinition[]): FigureIndex => ({
  idByName: new Map(stepFigures.map((figure) => [normalizeText(figure.name), figure.id])),
  nameById: new Map(stepFigures.map((figure) => [figure.id, figure.name])),
});

export const findFigureIdByName = (index: FigureIndex, name: string): number | undefined =>
  index.idByName.get(normalizeText(name));

/** Most used figures first, then alphabetical. */
export const sortCatalog = (stepFigures: StepFigureDefinition[]): StepFigureDefinition[] =>
  [...stepFigures].sort((left, right) => {
    if (left.used_by_choreography_count !== right.used_by_choreography_count) {
      return right.used_by_choreography_count - left.used_by_choreography_count;
    }
    return left.name.localeCompare(right.name);
  });

/** Names that can still be added as component: not yet chosen and never the figure itself. */
export const getComponentOptions = (
  catalog: StepFigureDefinition[],
  chosenIds: number[],
  ownId?: number,
): string[] =>
  catalog
    .filter((figure) => figure.id !== ownId && !chosenIds.includes(figure.id))
    .map((figure) => figure.name);

/** Unknown names are ignored; a figure cannot contain itself. */
export const addComponentByName = (
  ids: number[],
  name: string,
  index: FigureIndex,
  ownId?: number,
): number[] => {
  const componentId = findFigureIdByName(index, name);
  if (!componentId || componentId === ownId || ids.includes(componentId)) return ids;
  return [...ids, componentId];
};

export const removeComponentByName = (
  ids: number[],
  name: string,
  index: FigureIndex,
): number[] => {
  const componentId = findFigureIdByName(index, name);
  return componentId ? ids.filter((id) => id !== componentId) : ids;
};

export const toComponentNames = (ids: number[], index: FigureIndex): string[] =>
  ids.map((id) => index.nameById.get(id)).filter((name): name is string => Boolean(name));

/** The selected figure when it still exists, otherwise the first one. */
export const resolveSelectedFigure = (
  figures: StepFigureDefinition[],
  selectedId: number | null,
): StepFigureDefinition | null =>
  figures.find((figure) => figure.id === selectedId) ?? figures[0] ?? null;

export interface ComponentDraft {
  name: string;
  componentInput: string;
  componentIds: number[];
}

export const emptyDraft: ComponentDraft = { name: "", componentInput: "", componentIds: [] };

export const draftFromFigure = (figure: StepFigureDefinition | null): ComponentDraft =>
  figure
    ? {
        name: figure.name,
        componentInput: "",
        componentIds: figure.components.map((component) => component.id),
      }
    : emptyDraft;
