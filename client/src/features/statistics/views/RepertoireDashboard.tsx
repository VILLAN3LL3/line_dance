import "../../../styles/Dashboard.css";

import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import type { RepertoireStatisticsViewModel } from "../viewmodels/useRepertoireStatisticsViewModel";
import { groupMinorItems } from "../model/dashboard";
import { StatBarList } from "./StatBarList";
import { StatDonut } from "./StatDonut";
import { TimelineChart } from "./TimelineChart";

interface RepertoireDashboardProps {
  viewModel: RepertoireStatisticsViewModel;
}

/** More genres would make the donut unreadable. */
const MAX_NAMED_GENRES = 5;

export const RepertoireDashboard: React.FC<RepertoireDashboardProps> = ({ viewModel }) => {
  const { statistics, isLoading, error } = viewModel.state;

  if (isLoading) return <LoadingState message="Loading your statistics..." />;
  if (error || !statistics)
    return <ErrorMessage message={error ?? "Failed to load your statistics"} />;
  if (statistics.total === 0) {
    return (
      <EmptyState>
        No learned dances yet. Mark dances with the ✅ button on a choreography card to see your
        repertoire here.
      </EmptyState>
    );
  }

  const { total } = statistics;
  const genres = groupMinorItems(statistics.genres, MAX_NAMED_GENRES);
  const moreChoreographers = statistics.other_choreographers;

  return (
    <div className="dashboard">
      <p className="dashboard-total">
        <strong>{total}</strong> learned {total === 1 ? "dance" : "dances"}
      </p>
      <div className="dashboard-grid">
        <StatDonut title="By level" items={statistics.levels} />
        <StatDonut title="By tempo" items={statistics.tempo} />
        <StatDonut
          title="By genre"
          items={genres.items}
          note={
            genres.groupedCount > 0
              ? `${genres.groupedCount} more ${genres.groupedCount === 1 ? "genre is" : "genres are"} summed up as "Other".`
              : undefined
          }
        />
        <StatBarList
          title="By creation year"
          items={statistics.years}
          total={total}
          note="The year the choreography was created, not the year you learned it."
        />
        <StatBarList
          title="By choreographer"
          items={statistics.choreographers}
          total={total}
          note={
            moreChoreographers > 0
              ? `${moreChoreographers} more ${moreChoreographers === 1 ? "choreographer" : "choreographers"} with fewer dances. A dance counts for each of its choreographers.`
              : "A dance counts for each of its choreographers."
          }
        />
      </div>
      <TimelineChart months={statistics.timeline.months} undated={statistics.timeline.undated} />
    </div>
  );
};
