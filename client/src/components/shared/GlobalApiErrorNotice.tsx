import React, { useEffect, useState } from "react";

import { DATABASE_RESTARTING_EVENT } from "../../utils/apiErrors";

interface DatabaseRestartingEventDetail {
  message?: string;
}

export const GlobalApiErrorNotice: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleDatabaseRestarting = (event: Event) => {
      const detail = (event as CustomEvent<DatabaseRestartingEventDetail>).detail;
      if (detail?.message) setMessage(detail.message);
    };

    window.addEventListener(DATABASE_RESTARTING_EVENT, handleDatabaseRestarting);
    return () => window.removeEventListener(DATABASE_RESTARTING_EVENT, handleDatabaseRestarting);
  }, []);

  if (!message) return null;

  return (
    <div className="global-api-error-notice" role="alert">
      <span>{message}</span>
      <button type="button" aria-label="Dismiss database warning" onClick={() => setMessage(null)}>
        ×
      </button>
    </div>
  );
};
