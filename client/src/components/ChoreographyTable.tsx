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

const getSortIndicator = (sortState: string | false | undefined): string => {
  if (sortState === 'asc') return ' ⇧';
  if (sortState === 'desc') return ' ⇩';
  return '';
};

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
        const sorted = [...figures].sort((a: string, b: string) => a.localeCompare(b));
        setAllStepFigures(sorted);
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
    },
    {
      id: 'level',
      header: 'Level',
      accessorKey: 'level',
    },
    {
      id: 'count',
      header: 'Count',
      accessorKey: 'count',
    },
    {
      id: 'wall_count',
      header: 'Walls',
      accessorKey: 'wall_count',
    },
    {
      id: 'creation_year',
      header: 'Year',
      accessorKey: 'creation_year',
    },
    {
      id: 'tags',
      header: 'Tags',
      accessorKey: 'tags',
      cell: ({ getValue }) => (getValue() as string[]).join(', '),
    },
    {
      id: 'restart',
      header: 'Restart',
      accessorFn: (row: Choreography) => row.restart_information ? '✅' : '',
    },
    {
      id: 'tag',
      header: 'Tag',
      accessorFn: (row: Choreography) => row.tag_information ? '✅' : '',
    },
    ...allStepFigures.map(fig => ({
      id: fig,
      header: fig,
      accessorFn: (row: Choreography) => row.step_figures.includes(fig) ? '✅' : '',
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

  return (
    <div className="choreography-table-wrapper">
      <div className="table-scroll-wrapper">
        <table className="choreography-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => table.getColumn('name')?.toggleSorting()}>
                Name{getSortIndicator(table.getColumn('name')?.getIsSorted())}
              </th>
              <th className="sortable" onClick={() => table.getColumn('level')?.toggleSorting()}>
                Level{getSortIndicator(table.getColumn('level')?.getIsSorted())}
              </th>
              <th className="sortable" onClick={() => table.getColumn('count')?.toggleSorting()}>
                Count{getSortIndicator(table.getColumn('count')?.getIsSorted())}
              </th>
              <th className="sortable" onClick={() => table.getColumn('wall_count')?.toggleSorting()}>
                Walls{getSortIndicator(table.getColumn('wall_count')?.getIsSorted())}
              </th>
              <th className="sortable" onClick={() => table.getColumn('creation_year')?.toggleSorting()}>
                Year{getSortIndicator(table.getColumn('creation_year')?.getIsSorted())}
              </th>
              <th>Tags</th>
              <th className="figure-column sortable" onClick={() => table.getColumn('restart')?.toggleSorting()}>
                Restart{getSortIndicator(table.getColumn('restart')?.getIsSorted())}
              </th>
              <th className="figure-column sortable" onClick={() => table.getColumn('tag')?.toggleSorting()}>
                Tag{getSortIndicator(table.getColumn('tag')?.getIsSorted())}
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
                          window.open(choreo.step_sheet_link, '_blank');
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
                          window.open(choreo.demo_video_url, '_blank');
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
                          window.open(choreo.tutorial_video_url || '', '_blank');
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
