import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { browserHistory } from "../../../shared/browser/history";
import { storage } from "../../../shared/storage/storage";
import type { Choreography, SearchFilters } from "../../../types";
import { deleteChoreography, searchChoreographies } from "../api";
import {
  areFiltersEqual,
  CURRENT_FILTERS_STORAGE_KEY,
  DISPLAY_MODE_STORAGE_KEY,
  parseDisplayMode,
  parseFiltersParam,
  resolveInitialFilters,
  type DisplayMode,
} from "../model/search-session";
import { choreographyKeys } from "../queryKeys";

type View = "list" | "detail";

// The search page always shows every match, so one oversized page replaces server pagination.
const ALL_RESULTS = { page: 1, limit: 10000 };

/** ViewModel for the choreography search page: filters, display mode, results and delete flow. */
export const useChoreographySearchViewModel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const routeFilters = (location.state as { initialFilters?: SearchFilters } | null)
    ?.initialFilters;
  const urlFilters = parseFiltersParam(new URLSearchParams(location.search).get("filters"));

  const [view, setView] = useState<View>("list");
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() =>
    parseDisplayMode(storage.getString(DISPLAY_MODE_STORAGE_KEY)),
  );
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>(() =>
    resolveInitialFilters({
      routeFilters,
      urlFilters,
      storedFilters: storage.getJson<SearchFilters>(CURRENT_FILTERS_STORAGE_KEY),
    }),
  );
  const [selectedChoreography, setSelectedChoreography] = useState<Choreography | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const lastNavigationSignatureRef = useRef<string>(JSON.stringify(currentFilters));

  const resultsQuery = useQuery({
    queryKey: choreographyKeys.search(currentFilters),
    queryFn: () => searchChoreographies({ ...currentFilters, ...ALL_RESULTS }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteChoreography(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: choreographyKeys.all }),
  });

  // Filters handed over by navigation (router state or ?filters=) replace the current ones,
  // then get cleared so a browser reload does not apply them twice.
  useEffect(() => {
    const navigationFilters = routeFilters ?? urlFilters;
    if (!navigationFilters) return;

    const signature = JSON.stringify(navigationFilters);
    if (signature !== lastNavigationSignatureRef.current) {
      lastNavigationSignatureRef.current = signature;
      setCurrentFilters(navigationFilters);
    }
    if (routeFilters) {
      browserHistory.clearState();
    } else {
      browserHistory.clearQueryString();
    }
    // Re-run per navigation; the filters themselves are derived from location.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, location.search]);

  useEffect(() => {
    storage.setString(DISPLAY_MODE_STORAGE_KEY, displayMode);
  }, [displayMode]);

  useEffect(() => {
    storage.setJson(CURRENT_FILTERS_STORAGE_KEY, currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    if (resultsQuery.error) console.error(resultsQuery.error);
  }, [resultsQuery.error]);

  const choreographies = resultsQuery.data?.data ?? [];
  const error = actionError ?? (resultsQuery.isError ? "Failed to load choreographies" : null);
  const isLoading = resultsQuery.isFetching || deleteMutation.isPending;

  const search = async (filters: SearchFilters) => {
    setActionError(null);
    if (areFiltersEqual(filters, currentFilters)) {
      await resultsQuery.refetch();
      return;
    }
    setCurrentFilters(filters);
  };

  const selectChoreography = (id: number) => {
    const choreography = choreographies.find((item) => item.id === id);
    if (choreography) {
      setSelectedChoreography(choreography);
      setView("detail");
    }
  };

  const removeChoreography = async (id: number) => {
    setActionError(null);
    try {
      await deleteMutation.mutateAsync(id);
      setView("list");
    } catch (err) {
      setActionError("Failed to delete choreography");
      console.error(err);
    }
  };

  return {
    state: {
      view,
      displayMode,
      choreographies,
      selectedChoreography,
      currentFilters,
      isLoading,
      error,
    },
    actions: {
      search,
      changeDisplayMode: setDisplayMode,
      selectChoreography,
      showList: () => setView("list"),
      removeChoreography,
      addChoreography: () => void navigate("/choreographies/new"),
      editChoreography: (id: number) =>
        void navigate(`/choreographies/${id}`, { state: { editMode: true } }),
    },
  };
};
