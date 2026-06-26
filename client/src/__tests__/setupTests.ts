import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";

import { cleanup } from "@testing-library/react";

globalThis.HTMLElement.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
});
