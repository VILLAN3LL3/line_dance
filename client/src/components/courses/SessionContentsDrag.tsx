import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { useState } from "react";

import type { ReactNode } from "react";
import type { Session } from "../../types";

export function SessionContentsDragList({
  sessions,
  onReorder,
  children,
}: {
  readonly sessions: Session[];
  readonly onReorder: (sessionIds: number[]) => void;
  readonly children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const activeSession = sessions.find((session) => session.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(Number(active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={({ active, over }) => {
        setActiveId(null);
        if (!over || active.id === over.id) return;
        const from = sessions.findIndex((session) => session.id === active.id);
        const to = sessions.findIndex((session) => session.id === over.id);
        if (from < 0 || to < 0) return;
        onReorder(arrayMove(sessions, from, to).map((session) => session.id));
      }}
    >
      <SortableContext
        items={sessions.map((session) => session.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="sessions-list">{children}</div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeSession ? (
          <div className="session-content-drag-preview">
            <GripVertical size={20} aria-hidden="true" />
            <span>{activeSession.comment || "Session contents"}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export function SessionContentsDragItem({
  session,
  disabled,
  className,
  children,
}: {
  readonly session: Session;
  readonly disabled: boolean;
  readonly className: string;
  readonly children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging, isOver } =
    useSortable({
      id: session.id,
      disabled,
    });

  return (
    <div
      ref={setNodeRef}
      className={`${className}${isOver && !isDragging ? " session-drop-target" : ""}`}
      data-session-id={session.id}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="session-drag-handle"
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Move contents of session ${new Date(session.session_date).toLocaleDateString()}`}
        title="Move session contents"
      >
        <GripVertical size={20} aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}
