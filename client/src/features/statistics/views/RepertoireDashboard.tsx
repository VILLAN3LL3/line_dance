import "../../../styles/Dashboard.css";

import React from "react";

import { EmptyState, ErrorMessage, LoadingState } from "../../../shared/ui";
import type { RepertoireStatisticsViewModel } from "../viewmodels/useRepertoireStatisticsViewModel";
import { StatBarList } from "./StatBarList";
import { TimelineChart } from "./TimelineChart";

interface RepertoireDashboardProps {
  viewModel: RepertoireStatisticsViewModel;
}

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
  const moreChoreographers = statistics.other_choreographers;

  return (
    <div className="dashboard">
      <p className="dashboard-total">
        <strong>{total}</strong> learned {total === 1 ? "dance" : "dances"}
      </p>
      <div className="dashboard-grid">
        <StatBarList title="By level" items={statistics.levels} total={total} />
        <StatBarList title="By tempo" items={statistics.tempo} total={total} />
        <StatBarList title="By genre" items={statistics.genres} total={total} />
        <StatBarList title="By year" items={statistics.years} total={total} />
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
