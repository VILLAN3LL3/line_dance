/** True while the user has text selected, e.g. after dragging over a card. */
export function hasTextSelection(): boolean {
  return (window.getSelection()?.toString() ?? "") !== "";
}
