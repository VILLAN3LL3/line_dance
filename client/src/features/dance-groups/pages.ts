// Route-level pages live in their own entry: they depend on the courses feature, which in turn
// reads groups through index.ts, so exporting them from index.ts would create an import cycle.
export { default as DanceGroupDetail } from "./views/DanceGroupDetail";
export { default as DanceGroupsAdmin } from "./views/DanceGroupsAdmin";
