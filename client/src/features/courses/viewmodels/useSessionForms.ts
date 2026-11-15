import { useState } from "react";

import type { Session } from "../../../types";

/** Local form state of the session list: the "new session" form plus inline edit and swap modes. */
export const useSessionForms = () => {
  const [newDate, setNewDate] = useState("");
  const [newComment, setNewComment] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editComment, setEditComment] = useState("");
  const [swappingSessionId, setSwappingSessionId] = useState<number | null>(null);
  const [swapTargetSessionId, setSwapTargetSessionId] = useState("");

  const cancelSwap = () => {
    setSwappingSessionId(null);
    setSwapTargetSessionId("");
  };

  return {
    state: {
      newDate,
      newComment,
      editingSessionId,
      editDate,
      editComment,
      swappingSessionId,
      swapTargetSessionId,
    },
    actions: {
      changeNewDate: setNewDate,
      changeNewComment: setNewComment,
      resetNewSession: () => {
        setNewDate("");
        setNewComment("");
      },
      startEdit: (session: Session) => {
        setEditingSessionId(session.id);
        setEditDate(session.session_date.slice(0, 10));
        setEditComment(session.comment ?? "");
        cancelSwap();
      },
      cancelEdit: () => setEditingSessionId(null),
      changeEditDate: setEditDate,
      changeEditComment: setEditComment,
      startSwap: (sessionId: number) => {
        setSwappingSessionId(sessionId);
        setSwapTargetSessionId("");
        setEditingSessionId(null);
      },
      cancelSwap,
      changeSwapTarget: setSwapTargetSessionId,
    },
  };
};
