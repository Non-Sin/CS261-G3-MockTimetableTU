"use client";

import type { AppSection } from "../auth/components/AppNavigation";
import ElectivesPage from "../electives/ElectivesPage";
import QuotaSearchPage from "../quota/QuotaSearchPage";
import { TimetableContent } from "./Timetable";
import { useTimetable } from "./hooks/useTimetable";

type TimetableWorkspaceProps = {
  activeSection: AppSection;
  onOpenQuota: () => void;
};

export default function TimetableWorkspace({
  activeSection,
  onOpenQuota,
}: TimetableWorkspaceProps) {
  // ถือ state ไว้เหนือทั้งสองหน้า สลับเมนูแล้วภาคเรียนและผลเพิ่ม/ลบวิชายังเป็นชุดเดียวกัน
  const state = useTimetable();

  return (
    <>
      <div hidden={activeSection !== "timetable"}>
        <TimetableContent state={state} />
      </div>
      {activeSection === "electives" && (
        <ElectivesPage
          academicYear={state.selectedAcademicYear}
          currentSemester={state.selectedSemester}
          timetable={state.timetable}
          timetableError={state.loadError}
          addDisabled={state.addDisabled || state.loadError}
          onRetryTimetable={state.reload}
          onAddSection={state.addSection}
          onTimetableChanged={state.reload}
          onOpenQuota={onOpenQuota}
        />
      )}

      {activeSection === "quota" && (
        <QuotaSearchPage
          academicYear={state.selectedAcademicYear}
          semester={state.selectedSemester}
          myCourseCodes={state.entries.map((entry) => entry.courseCode)}
        />
      )}
    </>
  );
}
