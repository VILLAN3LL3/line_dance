import "../styles/ChoreographyTable.css";

import React, { useEffect, useMemo, useState } from "react";

import { ColumnDef, getCoreRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";

import { getStepFigures } from "../api";
import { Choreography } from "../types";

interface ChoreographyTableProps {
  choreographies: Choreography[];
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onSelect?: (id: number) => void;
  isLoading?: boolean;
}

type SortField = 'name' | 'level' | 'count' | 'wall_count' | 'creation_year';

export const ChoreographyTable: React.FC<ChoreographyTableProps> = ({
  choreographies,
  onEdit,
  onDelete,
  onSelect,
  isLoading = false,
}) => {
  const [allStepFigures, setAllStepFigures] = useState<string[]>([]);

  // Fetch all step figures on mount
  useEffect(() => {
    const fetchStepFigures = async () => {
      try {
        const figures = await getStepFigures();
        setAllStepFigures(figures.sort((a, b) => a.localeCompare(b)));
      } catch (error) {
        console.error('Failed to fetch step figures:', error);
      }
    };
    fetchStepFigures();
  }, []);

  // Define columns
  const columns: ColumnDef<Choreography>[] = useMemo(() => [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      sortingFn: 'alphanumeric',
    },
    {
      id: 'level',
      header: 'Level',
      accessorKey: 'level',
      sortingFn: 'alphanumeric',
    },
    {
      id: 'count',
      header: 'Count',
      accessorKey: 'count',
      sortingFn: 'basic',
    },
    {
      id: 'wall_count',
      header: 'Walls',
      accessorKey: 'wall_count',
      sortingFn: 'basic',
    },
    {
      id: 'creation_year',
      header: 'Year',
      accessorKey: 'creation_year',
      sortingFn: 'basic',
    },
    {
      id: 'tags',
      header: 'Tags',
      accessorKey: 'tags',
      sortingFn: 'alphanumeric',
      cell: ({ getValue }) => (getValue() as string[]).join(', '),
    },
    {
      id: 'restart',
      header: 'Restart',
      accessorFn: (row) => row.restart_information ? '✅' : '',
      sortingFn: 'alphanumeric',
    },
    {
      id: 'tag',
      header: 'Tag',
      accessorFn: (row) => row.tag_information ? '✅' : '',
      sortingFn: 'alphanumeric',
    },
    ...allStepFigures.map(fig => ({
      id: fig,
      header: fig,
      accessorFn: (row) => row.step_figures.includes(fig) ? '✅' : '',
      sortingFn: 'alphanumeric',
    })),
    {
      id: 'actions',
      header: 'Actions',
    },
  ], [allStepFigures]);

  const table = useReactTable({
    data: choreographies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Filter choreographies by selected figures
  const filteredChoreographies = useMemo(() => {
    return choreographies;
  }, [choreographies]);

  // Sort choreographies (client-side)
  const sortedChoreographies = useMemo(() => {
    return choreographies; // Table handles sorting
  }, [choreographies]);

  return (
    <div className="choreography-table-wrapper">
      <div className="table-scroll-wrapper">
        <table className="choreography-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => table.getColumn('name')?.toggleSorting()}>
                Name{table.getColumn('name')?.getIsSorted() === 'asc' ? ' ⇧' : table.getColumn('name')?.getIsSorted() === 'desc' ? ' ⇩' : ''}
              </th>
              <th className="sortable" onClick={() => table.getColumn('level')?.toggleSorting()}>
                Level{table.getColumn('level')?.getIsSorted() === 'asc' ? ' ⇧' : table.getColumn('level')?.getIsSorted() === 'desc' ? ' ⇩' : ''}
              </th>
              <th className="sortable" onClick={() => table.getColumn('count')?.toggleSorting()}>
                Count{table.getColumn('count')?.getIsSorted() === 'asc' ? ' ⇧' : table.getColumn('count')?.getIsSorted() === 'desc' ? ' ⇩' : ''}
              </th>
              <th className="sortable" onClick={() => table.getColumn('wall_count')?.toggleSorting()}>
                Walls{table.getColumn('wall_count')?.getIsSorted() === 'asc' ? ' ⇧' : table.getColumn('wall_count')?.getIsSorted() === 'desc' ? ' ⇩' : ''}
              </th>
              <th className="sortable" onClick={() => table.getColumn('creation_year')?.toggleSorting()}>
                Year{table.getColumn('creation_year')?.getIsSorted() === 'asc' ? ' ⇧' : table.getColumn('creation_year')?.getIsSorted() === 'desc' ? ' ⇩' : ''}
              </th>
              <th>Tags</th>
              <th className="figure-column sortable" onClick={() => table.getColumn('restart')?.toggleSorting()}>
                Restart{table.getColumn('restart')?.getIsSorted() === 'asc' ? ' ⇧' : table.getColumn('restart')?.getIsSorted() === 'desc' ? ' ⇩' : ''}
              </th>
              <th className="figure-column sortable" onClick={() => table.getColumn('tag')?.toggleSorting()}>
                Tag{table.getColumn('tag')?.getIsSorted() === 'asc' ? ' ⇧' : table.getColumn('tag')?.getIsSorted() === 'desc' ? ' ⇩' : ''}
              </th>
              {allStepFigures.map(figure => (
                <th key={figure} className="figure-column" title={figure}>
                  {figure}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const choreo = row.original;
              return (
                <tr key={choreo.id} className="choreography-row" onClick={() => onSelect?.(choreo.id)}>
                  <td className="name-cell">
                    <strong>{choreo.name}</strong>
                  </td>
                  <td className="level-cell">{choreo.level}</td>
                  <td>{choreo.count || '-'}</td>
                  <td>{choreo.wall_count || '-'}</td>
                  <td>{choreo.creation_year || '-'}</td>
                  <td>
                    <div className="tags-cell">
                      {choreo.tags.length > 0 ? choreo.tags.join(', ') : '-'}
                    </div>
                  </td>
                  <td className="figure-cell">
                    {choreo.restart_information ? '✅' : ''}
                  </td>
                  <td className="figure-cell">
                    {choreo.tag_information ? '✅' : ''}
                  </td>
                  {allStepFigures.map(figure => (
                    <td key={`${choreo.id}-${figure}`} className="figure-cell">
                      {choreo.step_figures.includes(figure) ? '✅' : ''}
                    </td>
                  ))}
                  <td className="actions-cell">
                    {choreo.step_sheet_link && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(choreo.step_sheet_link!, '_blank');
                        }}
                        className="btn-small btn-secondary"
                        title="Open Step Sheet"
                      >
                        🦶
                      </button>
                    )}
                    {choreo.demo_video_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(choreo.demo_video_url!, '_blank');
                        }}
                        className="btn-small btn-secondary"
                        title="Open Demo Video"
                      >
                        🎬
                      </button>
                    )}
                    {choreo.tutorial_video_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(choreo.tutorial_video_url!, '_blank');
                        }}
                        className="btn-small btn-secondary"
                        title="Open Tutorial Video"
                      >
                        🎓
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onEdit?.(choreo.id);
                      }}
                      className="btn-small btn-primary"
                      disabled={isLoading}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onDelete?.(choreo.id);
                      }}
                      className="btn-small btn-danger"
                      disabled={isLoading}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
