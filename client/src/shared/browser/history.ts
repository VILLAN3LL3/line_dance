/** Browser history access for view models; keeps `globalThis.history` out of components. */
export const browserHistory = {
  /** Drops router state after it was consumed so a reload does not re-apply it. */
  clearState(): void {
    globalThis.history.replaceState({}, document.title);
  },

  /** Removes the query string after it was consumed (new-tab links carry state in `?filters=`). */
  clearQueryString(): void {
    globalThis.history.replaceState({}, document.title, globalThis.location.pathname);
  },
};
