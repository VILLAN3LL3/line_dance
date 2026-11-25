import { afterEach, describe, expect, it, vi } from "vitest";

import { render } from "@testing-library/react";

import { useOnVisible } from "../../shared/browser/useOnVisible";

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

const observers: { callback: ObserverCallback; observe: () => void; disconnect: () => void }[] = [];

function installObserver() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      constructor(callback: ObserverCallback) {
        observers.push({ callback, observe: this.observe, disconnect: this.disconnect });
      }
    },
  );
}

function Probe({ onVisible, enabled }: { onVisible: () => void; enabled: boolean }) {
  const ref = useOnVisible<HTMLDivElement>(onVisible, enabled);
  return <div ref={ref}>end</div>;
}

afterEach(() => {
  observers.length = 0;
  vi.unstubAllGlobals();
});

describe("useOnVisible", () => {
  it("calls back when the element scrolls into view, not before", () => {
    installObserver();
    const onVisible = vi.fn();
    render(<Probe onVisible={onVisible} enabled />);

    observers[0].callback([{ isIntersecting: false }]);
    expect(onVisible).not.toHaveBeenCalled();
    observers[0].callback([{ isIntersecting: true }]);
    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it("does not observe while disabled and disconnects on unmount", () => {
    installObserver();
    const { rerender, unmount } = render(<Probe onVisible={vi.fn()} enabled={false} />);
    expect(observers).toHaveLength(0);

    rerender(<Probe onVisible={vi.fn()} enabled />);
    expect(observers).toHaveLength(1);
    unmount();
    expect(observers[0].disconnect).toHaveBeenCalled();
  });

  it("does nothing without IntersectionObserver support", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const onVisible = vi.fn();
    expect(() => render(<Probe onVisible={onVisible} enabled />)).not.toThrow();
    expect(onVisible).not.toHaveBeenCalled();
  });
});
