import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { getCourseQuota, searchQuotaCourses } from "./api";
import type { QuotaCourse } from "./types";

type QuotaRequest =
  | { kind: "search"; q: string; mine: boolean }
  | { kind: "course"; courseCode: string };

export type QuotaSearchState =
  | { status: "idle" }
  | { status: "loading"; request: QuotaRequest }
  | { status: "success"; request: QuotaRequest; courses: QuotaCourse[]; total: number }
  | { status: "notFound"; request: QuotaRequest }
  | { status: "error"; request: QuotaRequest };

type UseQuotaSearchOptions = { academicYear: number; semester: number };

// ถือ state ของหน้าค้นหา: คำค้น, checkbox, และผลลัพธ์ (idle/loading/success/notFound/error)
// ไม่เรียก API เมื่อคำค้นว่างและไม่ได้ติ๊ก checkbox (backend จะตอบ 400 QUOTA_SEARCH_QUERY_REQUIRED)
export function useQuotaSearch({ academicYear, semester }: UseQuotaSearchOptions) {
  const [input, setInput] = useState("");
  const [mine, setMine] = useState(false);
  const [state, setState] = useState<QuotaSearchState>({ status: "idle" });
  // นับลำดับคำขอ เพื่อไม่ใช้ผลของคำขอเก่าที่ตอบกลับมาช้ากว่าคำขอใหม่
  const latestRequestId = useRef(0);

  const run = useCallback(
    (request: QuotaRequest) => {
      const requestId = ++latestRequestId.current;
      const term = { academicYear, semester: semester as 1 | 2 };
      setState({ status: "loading", request });

      const load =
        request.kind === "search"
          ? searchQuotaCourses({ ...term, q: request.q, mine: request.mine }).then((response) => ({
              courses: response.courses,
              total: response.total,
            }))
          : getCourseQuota(request.courseCode, term).then((course) => ({ courses: [course], total: 1 }));

      load
        .then((result) => {
          if (requestId === latestRequestId.current) setState({ status: "success", request, ...result });
        })
        .catch((error: unknown) => {
          if (requestId !== latestRequestId.current) return;
          // 404 ของวิชาเดี่ยว = ไม่พบวิชาในระบบ แสดงแบบเดียวกับค้นหาไม่พบ; error อื่นแสดงปุ่มลองใหม่
          const notFound = request.kind === "course" && error instanceof ApiError && error.status === 404;
          setState({ status: notFound ? "notFound" : "error", request });
        });
    },
    [academicYear, semester],
  );

  const backToIdle = useCallback(() => {
    latestRequestId.current += 1; // ทิ้งผลของคำขอที่ยังค้างอยู่
    setState({ status: "idle" });
  }, []);

  const search = useCallback(
    ({ q, mine: onlyMine }: { q: string; mine: boolean }) => {
      const trimmed = q.trim();
      if (!trimmed && !onlyMine) backToIdle();
      else run({ kind: "search", q: trimmed, mine: onlyMine });
    },
    [backToIdle, run],
  );

  // ติ๊ก/เลิกติ๊กแล้วค้นใหม่ทันที
  const changeMine = (next: boolean) => {
    setMine(next);
    search({ q: input, mine: next });
  };

  const clear = () => {
    setInput("");
    search({ q: "", mine });
  };

  // กดชิปรหัสวิชา: ใส่รหัสลงช่องค้นหาและแทนผลเดิมด้วยการ์ดของวิชานั้น
  // เลิกติ๊ก "เฉพาะวิชาในแผนของฉัน" เพราะวิชาที่อ้างถึงอาจไม่อยู่ในตาราง
  const selectCourse = (courseCode: string) => {
    setInput(courseCode);
    setMine(false);
    run({ kind: "course", courseCode });
  };

  const retry = () => {
    if (state.status === "error") run(state.request);
  };

  return { input, setInput, mine, changeMine, state, search, clear, selectCourse, retry };
}
