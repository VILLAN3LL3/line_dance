import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "@testing-library/react";

import { ChoreographyCard } from "../../components/ChoreographyCard";

import type { Choreography } from '../../types';

function makeChoreography(overrides: Partial<Choreography> = {}): Choreography {
  return {
    id: 42,
    name: 'Neon Waltz',
    level: 'Intermediate',
    count: 32,
    wall_count: 4,
    creation_year: 2024,
    step_sheet_link: 'https://example.com/step-sheet',
    demo_video_url: 'https://example.com/demo',
    tutorial_video_url: 'https://example.com/tutorial',
    authors: ['Alice', 'Bob'],
    tags: ['smooth', 'classic'],
    step_figures: ['Weave', 'Rock Step'],
    restart_information: 'Has restart',
    tag_information: 'Has tag',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

describe('ChoreographyCard', () => {
  it('renders core choreography fields and links', () => {
    render(<ChoreographyCard choreography={makeChoreography()} />);

    expect(screen.getByText('Neon Waltz')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText(/Count:/)).toBeInTheDocument();
    expect(screen.getByText(/Wall:/)).toBeInTheDocument();
    expect(screen.getByText(/Year:/)).toBeInTheDocument();
    expect(screen.getByText(/Authors:/)).toBeInTheDocument();
    expect(screen.getByText(/Tags:/)).toBeInTheDocument();
    expect(screen.getByText('Restart 🔁')).toBeInTheDocument();
    expect(screen.getByText('Tag 🌉')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /view step sheet/i })).toHaveAttribute(
      'href',
      'https://example.com/step-sheet',
    );
    expect(screen.getByRole('link', { name: /watch demo/i })).toHaveAttribute(
      'href',
      'https://example.com/demo',
    );
    expect(screen.getByRole('link', { name: /watch tutorial/i })).toHaveAttribute(
      'href',
      'https://example.com/tutorial',
    );
  });

  it('calls onSelect when clicking the card body', () => {
    const onSelect = vi.fn();

    render(<ChoreographyCard choreography={makeChoreography()} onSelect={onSelect} />);

    const card = screen.getAllByText('Neon Waltz')[0].closest('.choreography-card');
    if (card) {
      fireEvent.click(card);
    }

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(42);
  });

  it('calls onEdit and onDelete without triggering onSelect', () => {
    const onSelect = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();

    render(
      <ChoreographyCard
        choreography={makeChoreography()}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onEdit).toHaveBeenCalledWith(42);
    expect(onDelete).toHaveBeenCalledWith(42);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
