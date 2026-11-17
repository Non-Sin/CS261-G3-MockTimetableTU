import { useEffect, useState } from "react";
import { fetchElectives } from "../api";
import type { ElectiveSearchParams, ElectiveSummary } from "../types";

type SearchResult = { key: string; courses: ElectiveSummary[]; error: boolean };

export function useElectiveSearch(
  params: ElectiveSearchParams,
  refreshVersion: number,
) {
  const {
    academicYear,
    currentSemester,
    q,
    semester,
    day,
    timeSlot,
    group,
    excludeConflicts,
  } = params;
  const [retryVersion, setRetryVersion] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const key = JSON.stringify([
    academicYear,
    currentSemester,
    q,
    semester,
    day,
    timeSlot,
    group,
    excludeConflicts,
    refreshVersion,
    retryVersion,
  ]);

  useEffect(() => {
    let ignore = false;
    fetchElectives({
      academicYear,
      currentSemester,
      q,
      semester,
      day,
      timeSlot,
      group,
      excludeConflicts,
    })
      .then((courses) => {
        if (!ignore) setResult({ key, courses, error: false });
      })
      .catch(() => {
        if (!ignore) setResult({ key, courses: [], error: true });
      });
    // คำค้นหรือตัวกรองเปลี่ยนแล้ว ไม่ให้ response เก่าทับผลชุดใหม่
    return () => {
      ignore = true;
    };
  }, [
    academicYear,
    currentSemester,
    q,
    semester,
    day,
    timeSlot,
    group,
    excludeConflicts,
    refreshVersion,
    retryVersion,
    key,
  ]);

  const current = result?.key === key ? result : null;
  return {
    courses: current?.courses ?? [],
    loading: current === null,
    error: current?.error ?? false,
    retry: () => setRetryVersion((value) => value + 1),
  };
}
