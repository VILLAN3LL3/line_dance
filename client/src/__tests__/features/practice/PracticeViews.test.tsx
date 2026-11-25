import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@testing-library/react";

import { FlipCard } from "../../../shared/ui";
import { PracticeCardBack } from "../../../features/practice/views/PracticeCardBack";
import { makeDance, makeSummary } from "./testData";

describe("FlipCard", () => {
  const renderCard = () =>
    render(
      <FlipCard
        label="Dance"
        front={
          <div>
            <p>Front side</p>
            <button>Front action</button>
            <button
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              Own handler
            </button>
          </div>
        }
        back={<p>Back side</p>}
      />,
    );
  const inner = (container: HTMLElement) =>
    container.querySelector<HTMLElement>(".flip-card-inner")!;
  const edge = (container: HTMLElement, side: "left" | "right") =>
    container.querySelector<HTMLElement>(`.flip-card-edge-${side}`)!;

  it("shows the front first and hides the back from assistive technology", () => {
    render(<FlipCard label="Dance" front={<p>Front side</p>} back={<p>Back side</p>} />);

    expect(screen.getByText("Front side").parentElement).not.toHaveAttribute("inert");
    const back = screen.getByText("Back side").parentElement;
    expect(back).toHaveAttribute("aria-hidden", "true");
    expect(back).toHaveAttribute("inert");
  });

  it("flips completely with a click on the card and back with another", () => {
    renderCard();

    fireEvent.click(screen.getByText("Front side"));
    expect(screen.getByText("Back side").parentElement).not.toHaveAttribute("inert");
    expect(screen.getByText("Front side").parentElement?.parentElement).toHaveAttribute("inert");

    fireEvent.click(screen.getByText("Back side"));
    expect(screen.getByText("Back side").parentElement).toHaveAttribute("inert");
  });

  it("does not flip for clicks on controls or on elements that handle the click themselves", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Front action" }));
    fireEvent.click(screen.getByRole("button", { name: "Own handler" }));

    expect(screen.getByText("Back side").parentElement).toHaveAttribute("inert");
  });

  it("does not flip while text is selected", () => {
    renderCard();
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "Front" } as Selection);

    fireEvent.click(screen.getByText("Front side"));

    expect(screen.getByText("Back side").parentElement).toHaveAttribute("inert");
    vi.restoreAllMocks();
  });

  it("tilts towards the edge the pointer rests on and straightens again", () => {
    const { container } = renderCard();
    expect(inner(container).style.transform).toBe("rotateY(0deg)");

    fireEvent.mouseEnter(edge(container, "left"));
    expect(inner(container).style.transform).toBe("rotateY(14deg)");
    fireEvent.mouseLeave(edge(container, "left"));
    fireEvent.mouseEnter(edge(container, "right"));
    expect(inner(container).style.transform).toBe("rotateY(-14deg)");
    fireEvent.mouseLeave(edge(container, "right"));
    expect(inner(container).style.transform).toBe("rotateY(0deg)");
  });

  it("flips in the direction of the tilt when the edge is clicked", () => {
    const { container } = renderCard();

    fireEvent.mouseEnter(edge(container, "right"));
    fireEvent.click(edge(container, "right"));
    expect(inner(container).style.transform).toBe("rotateY(-194deg)");

    fireEvent.mouseLeave(edge(container, "right"));
    fireEvent.mouseEnter(edge(container, "left"));
    fireEvent.click(edge(container, "left"));
    expect(inner(container).style.transform).toBe("rotateY(14deg)");
  });

  it("can be flipped with the keyboard control", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "Show back of Dance" }));
    expect(screen.getByRole("button", { name: "Show front of Dance" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("button", { name: "Front action" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show front of Dance" }));
    expect(screen.getByRole("button", { name: "Front action" })).toBeInTheDocument();
  });
});

describe("PracticeCardBack", () => {
  const dance = makeDance(1, "Cowboy Boogie", {
    choreography_information: [
      { category: "Tag", description: "after wall 2" },
      { category: "Restart", description: "wall 4" },
    ],
    choreography_songs: [
      { id: 10, title: "Song A", artist: "Artist", is_favorite: true },
      { id: 11, title: "Song B", artist: "Artist", is_favorite: false },
    ],
  });
  const summary = makeSummary(1, {
    last_practiced_on: "2026-11-10",
    last_note: "watch the turn",
    practice_count: 3,
    next_due_on: "2026-11-24",
    days_overdue: 0,
  });

  it("shows the music, restarts and tags, and the practice record", () => {
    render(
      <PracticeCardBack
        choreography={dance}
        summary={summary}
        isSaving={false}
        onPractice={vi.fn()}
      />,
    );

    expect(screen.getByText("Music:").parentElement).toHaveTextContent("Artist - Song A");
    const aids = screen.getByRole("list", { name: "Restarts and tags" });
    expect(aids.textContent).toMatch(/Restart:.*wall 4.*Tag:.*after wall 2/);
    expect(screen.getByText("2026-11-10")).toBeInTheDocument();
    expect(screen.getByText("3 times")).toBeInTheDocument();
    expect(screen.getAllByText("Due today").length).toBeGreaterThan(0);
    expect(screen.getByText("“watch the turn”")).toBeInTheDocument();
  });

  it("reports the practice with date, note and song", () => {
    const onPractice = vi.fn();
    render(
      <PracticeCardBack
        choreography={dance}
        summary={summary}
        isSaving={false}
        onPractice={onPractice}
      />,
    );

    fireEvent.change(screen.getByLabelText("Practiced on"), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "restart tricky" } });
    fireEvent.change(screen.getByLabelText("Song"), { target: { value: "11" } });
    fireEvent.click(screen.getByRole("button", { name: /Unsure/ }));

    expect(onPractice).toHaveBeenCalledWith({
      practicedOn: "2026-11-20",
      confidence: "unsure",
      note: "restart tricky",
      songId: 11,
    });
    fireEvent.click(screen.getByRole("button", { name: /Sure/ }));
    expect(onPractice).toHaveBeenLastCalledWith(expect.objectContaining({ confidence: "sure" }));
  });

  it("only offers a song choice for several songs and disables the buttons while saving", () => {
    render(
      <PracticeCardBack
        choreography={makeDance(2, "Solo", { choreography_songs: [] })}
        summary={makeSummary(2)}
        isSaving
        onPractice={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Song")).toBeNull();
    expect(screen.getByText("No song")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sure/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Unsure/ })).toBeDisabled();
  });
});
