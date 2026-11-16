package th.ac.tu.cs261.group3.backend.studyplan;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.ScheduleSlot;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.studyplan.dto.PlanCourseSource;
import th.ac.tu.cs261.group3.backend.studyplan.dto.SkippedPlanCourseResponse;
import th.ac.tu.cs261.group3.backend.timetable.ScheduleOverlap;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * เลือก section ของวิชาในแผนด้วย backtracking ตาม US8-T05 Spec หัวข้อ "วิธีเลือก section" ไม่ใช้ DB
 * <ol>
 *   <li>กรองก่อนค้นหา: วิชาที่มีในตารางแล้ว / ไม่มี section / ทุก section ชนกับตารางเดิม แล้วรวม section ที่เวลาเหมือนกันเป็นกลุ่มเวลา</li>
 *   <li>ค้นหา: เริ่มจากคำตอบ greedy แล้ว backtracking พร้อม branch and bound จนครบหรือถึงเพดาน {@code maxNodes}</li>
 *   <li>สรุปผล: วิชาที่ไม่ได้ถูกจัดเป็น {@code CREDIT_LIMIT_EXCEEDED} หรือ {@code TIME_CONFLICT} โดยเทียบกับตารางสุดท้าย</li>
 * </ol>
 * เกณฑ์ "ดีที่สุด" เทียบตามลำดับ: MAJOR ของแผนหลัก → วิชาแผนหลัก → วิชาโท → หน่วยกิต → sectionNo ตามลำดับในแผน (น้อยกว่าชนะ)
 * ข้อสุดท้ายทำให้ผลไม่ขึ้นกับลำดับการค้นหา ระบบจึงค้นต่อหลังเจอชุดที่ลงครบ จนกว่าจะพิสูจน์ได้ว่าไม่มีชุดที่ดีกว่า (ตัดกิ่งด้วย bound)
 * <p>
 * ไม่ thread-safe ต่อการเรียกครั้งเดียว แต่ทุกสถานะอยู่ใน {@link Search} ที่สร้างใหม่ทุกครั้ง bean จึงใช้ร่วมกันได้
 */
@Component
public class PlanScheduler {

    private static final int SKIP = Integer.MAX_VALUE;

    /** ลำดับในแผน: PLAN → MINOR แล้วตามหมวด MAJOR → MINOR → GENERAL_EDUCATION → FREE_ELECTIVE แล้วตาม sortOrder */
    static final Comparator<PlanCourseCandidate> PLAN_ORDER = Comparator
            .comparing(PlanCourseCandidate::source)
            .thenComparingInt(c -> categoryRank(c.course().getCategory()))
            .thenComparingInt(PlanCourseCandidate::planOrder);

    private final int maxNodes;

    public PlanScheduler(@Value("${app.study-plan.max-search-nodes:50000}") int maxNodes) {
        this.maxNodes = maxNodes;
    }

    /**
     * @param candidates วิชาของแผน + วิชาโท (ตัดตัวซ้ำแล้ว) ลำดับใดก็ได้
     * @param existing   section ในตารางเดิมของภาคนั้น เรียงตามลำดับที่เพิ่ม
     * @param maxCredits หน่วยกิตสูงสุดของตาราง (เดิม + ที่เพิ่ม)
     */
    public ScheduleResult schedule(List<PlanCourseCandidate> candidates, List<Section> existing, int maxCredits) {
        List<PlanCourseCandidate> ordered = candidates.stream().sorted(PLAN_ORDER).toList();
        int existingCredits = existing.stream().mapToInt(s -> s.getCourse().getCredits()).sum();

        // ---------- ขั้นที่ 1: กรองก่อนค้นหา ----------
        Map<PlanCourseCandidate, SkippedPlanCourseResponse> early = new LinkedHashMap<>();
        List<Item> items = new ArrayList<>();
        for (PlanCourseCandidate c : ordered) {
            Course course = c.course();
            Section inTimetable = existing.stream()
                    .filter(s -> s.getCourse().getCourseCode().equals(course.getCourseCode()))
                    .findFirst().orElse(null);
            if (inTimetable != null) {
                early.put(c, SkippedPlanCourseResponse.alreadyInTimetable(course, c.source(), inTimetable.getSectionNo()));
            } else if (c.sections().isEmpty()) {
                early.put(c, SkippedPlanCourseResponse.noSectionAvailable(course, c.source()));
            } else {
                List<Section> free = c.sections().stream()
                        .filter(s -> existing.stream().noneMatch(e -> ScheduleOverlap.conflicts(s, e)))
                        .toList();
                if (free.isEmpty()) {
                    early.put(c, null); // TIME_CONFLICT สรุปตอนท้ายเทียบกับตารางสุดท้าย
                } else {
                    items.add(new Item(c, groupByTimePattern(free)));
                }
            }
        }

        // ---------- ขั้นที่ 2: ค้นหา ----------
        Search search = new Search(items, maxCredits - existingCredits, maxNodes);
        int[] choice = search.run();

        // ---------- ขั้นที่ 3: สรุปผล ----------
        return summarize(ordered, items, choice, early, existing, existingCredits, maxCredits);
    }

    /**
     * รวม section ที่ทุกคาบตรงกันทั้งวัน เวลาเริ่ม และเวลาจบ เป็นกลุ่มเดียว ใช้ section ที่ sectionNo น้อยที่สุดเป็นตัวแทน
     * คืนตัวแทนเรียงตาม sectionNo ห้องและผู้สอนไม่มีผลกับการชน
     */
    static List<Section> groupByTimePattern(List<Section> sections) {
        Map<List<String>, Section> groups = new LinkedHashMap<>();
        for (Section s : sections) {
            List<String> key = s.getSlots().stream()
                    .map(PlanScheduler::slotKey)
                    .sorted()
                    .toList();
            groups.merge(key, s, (a, b) -> a.getSectionNo().compareTo(b.getSectionNo()) <= 0 ? a : b);
        }
        return groups.values().stream()
                .sorted(Comparator.comparing(Section::getSectionNo))
                .toList();
    }

    private static String slotKey(ScheduleSlot slot) {
        return slot.getDayOfWeek() + "|" + slot.getStartTime() + "|" + slot.getEndTime();
    }

    private static int categoryRank(CourseCategory category) {
        return switch (category) {
            case MAJOR -> 0;
            case MINOR -> 1;
            case GENERAL_EDUCATION -> 2;
            case FREE_ELECTIVE -> 3;
        };
    }

    private ScheduleResult summarize(List<PlanCourseCandidate> ordered, List<Item> items, int[] choice,
                                     Map<PlanCourseCandidate, SkippedPlanCourseResponse> early,
                                     List<Section> existing, int existingCredits, int maxCredits) {
        List<ScheduleResult.Added> added = new ArrayList<>();
        Map<PlanCourseCandidate, Item> itemOf = new LinkedHashMap<>();
        for (int i = 0; i < items.size(); i++) {
            Item item = items.get(i);
            itemOf.put(item.candidate, item);
            if (choice[i] != SKIP) {
                added.add(new ScheduleResult.Added(item.groups.get(choice[i]), item.candidate.source()));
            }
        }

        List<Section> finalTable = new ArrayList<>(existing);
        added.forEach(a -> finalTable.add(a.section()));
        int finalCredits = existingCredits + added.stream().mapToInt(a -> a.section().getCourse().getCredits()).sum();

        List<SkippedPlanCourseResponse> skipped = new ArrayList<>();
        for (PlanCourseCandidate c : ordered) {
            if (early.containsKey(c)) {
                SkippedPlanCourseResponse response = early.get(c);
                skipped.add(response != null ? response
                        : SkippedPlanCourseResponse.timeConflict(c.course(), c.source(), conflictWith(c.sections(), finalTable)));
                continue;
            }
            Item item = itemOf.get(c);
            if (choice[items.indexOf(item)] != SKIP) {
                continue;
            }
            boolean fitsTime = item.groups.stream()
                    .anyMatch(g -> finalTable.stream().noneMatch(t -> ScheduleOverlap.conflicts(g, t)));
            skipped.add(fitsTime
                    ? SkippedPlanCourseResponse.creditLimitExceeded(c.course(), c.source(), finalCredits, maxCredits)
                    : SkippedPlanCourseResponse.timeConflict(c.course(), c.source(), conflictWith(c.sections(), finalTable)));
        }
        return new ScheduleResult(added, skipped);
    }

    /** รหัสวิชาในตารางที่ชนกับ section ใด ๆ ของวิชานี้ ไม่ซ้ำ เรียงตามลำดับในตาราง */
    private static List<String> conflictWith(List<Section> sections, List<Section> table) {
        Set<String> codes = new LinkedHashSet<>();
        for (Section t : table) {
            if (sections.stream().anyMatch(s -> ScheduleOverlap.conflicts(s, t))) {
                codes.add(t.getCourse().getCourseCode());
            }
        }
        return List.copyOf(codes);
    }

    /** วิชาที่เข้าสู่การค้นหา พร้อมกลุ่มเวลาที่ไม่ชนกับตารางเดิม (ตัวแทนเรียงตาม sectionNo) */
    private record Item(PlanCourseCandidate candidate, List<Section> groups) {

        int credits() {
            return candidate.course().getCredits();
        }

        boolean isPlan() {
            return candidate.source() == PlanCourseSource.PLAN;
        }

        boolean isPlanMajor() {
            return isPlan() && candidate.course().getCategory() == CourseCategory.MAJOR;
        }
    }

    /** คะแนนตามเกณฑ์ข้อ 1–4 มากกว่าดีกว่า */
    private record Score(int planMajor, int plan, int minor, int credits) implements Comparable<Score> {

        private static final Comparator<Score> ORDER = Comparator.comparingInt(Score::planMajor)
                .thenComparingInt(Score::plan)
                .thenComparingInt(Score::minor)
                .thenComparingInt(Score::credits);

        @Override
        public int compareTo(Score other) {
            return ORDER.compare(this, other);
        }
    }

    /**
     * สถานะการค้นหาของการเรียก schedule 1 ครั้ง
     * {@code choice[i]} = index ของกลุ่มเวลาที่เลือกของ items[i] (ลำดับในแผน) หรือ {@link #SKIP}
     * เพราะกลุ่มเรียงตาม sectionNo การเทียบ index จึงเท่ากับการเทียบ sectionNo (เกณฑ์ข้อ 5)
     */
    private static final class Search {

        private final List<Item> items;
        private final int creditBudget;
        private final int maxNodes;
        /** ลำดับการวาง: กลุ่มเวลาน้อยก่อน เท่ากันตามลำดับในแผน (มีผลแค่ความเร็ว) */
        private final int[] order;

        private final int[] choice;
        private final List<Section> placed = new ArrayList<>();
        private int planMajor;
        private int plan;
        private int minor;
        private int credits;

        private int[] bestChoice;
        private Score bestScore;
        private int nodes;
        private boolean stopped;

        Search(List<Item> items, int creditBudget, int maxNodes) {
            this.items = items;
            this.creditBudget = creditBudget;
            this.maxNodes = maxNodes;
            this.order = java.util.stream.IntStream.range(0, items.size()).boxed()
                    .sorted(Comparator.<Integer>comparingInt(i -> items.get(i).groups().size())
                            .thenComparingInt(i -> i))
                    .mapToInt(Integer::intValue)
                    .toArray();
            this.choice = new int[items.size()];
            Arrays.fill(choice, SKIP);
        }

        int[] run() {
            greedy();
            search(0);
            fill();
            return bestChoice;
        }

        /** คำตอบเริ่มต้น: วางตามลำดับในแผน เลือกกลุ่มเวลาแรกที่ลงได้ ผลสุดท้ายจึงไม่แย่กว่า greedy */
        private void greedy() {
            for (int i = 0; i < items.size(); i++) {
                int g = firstFit(items.get(i));
                if (g != SKIP) {
                    place(i, g);
                }
            }
            bestChoice = choice.clone();
            bestScore = score();
            for (int i = 0; i < items.size(); i++) {
                if (choice[i] != SKIP) {
                    unplace(i);
                }
            }
        }

        private void search(int depth) {
            if (stopped) {
                return;
            }
            if (++nodes > maxNodes) {
                stopped = true;
                return;
            }
            if (depth == order.length) {
                Score current = score();
                int cmp = current.compareTo(bestScore);
                if (cmp > 0 || (cmp == 0 && compareTieBreak(choice, bestChoice) < 0)) {
                    bestScore = current;
                    bestChoice = choice.clone();
                }
                return;
            }
            if (!canBeatBest(depth)) {
                return;
            }

            int index = order[depth];
            Item item = items.get(index);
            if (credits + item.credits() <= creditBudget) {
                for (int g = 0; g < item.groups().size() && !stopped; g++) {
                    if (fits(item.groups().get(g))) {
                        place(index, g);
                        search(depth + 1);
                        unplace(index);
                    }
                }
            }
            if (!stopped) {
                search(depth + 1); // ข้ามวิชานี้ ลองเป็นทางเลือกสุดท้าย
            }
        }

        /**
         * branch and bound: คะแนนสูงสุดที่เป็นไปได้ (วางแล้ว + วิชาที่เหลือทั้งหมด) ต้องไม่แพ้คำตอบที่ดีที่สุดตอนนี้
         * ถ้าเท่ากัน ต้องยังมีโอกาสชนะด้วยเกณฑ์ข้อ 5 (วิชาที่ยังไม่วางถือว่าได้กลุ่มแรก)
         */
        private boolean canBeatBest(int depth) {
            int ubPlanMajor = planMajor;
            int ubPlan = plan;
            int ubMinor = minor;
            int ubCredits = credits;
            for (int d = depth; d < order.length; d++) {
                Item item = items.get(order[d]);
                if (item.isPlanMajor()) {
                    ubPlanMajor++;
                }
                if (item.isPlan()) {
                    ubPlan++;
                } else {
                    ubMinor++;
                }
                ubCredits += item.credits();
            }
            Score upper = new Score(ubPlanMajor, ubPlan, ubMinor, Math.min(ubCredits, creditBudget));
            int cmp = upper.compareTo(bestScore);
            if (cmp != 0) {
                return cmp > 0;
            }

            boolean[] decided = new boolean[items.size()];
            for (int d = 0; d < depth; d++) {
                decided[order[d]] = true;
            }
            for (int i = 0; i < items.size(); i++) {
                int optimistic = decided[i] ? choice[i] : 0;
                if (optimistic != bestChoice[i]) {
                    return optimistic < bestChoice[i];
                }
            }
            return false;
        }

        /** หลังค้นหา (กรณีถึงเพดาน) เติมวิชาที่ยังลงได้ตามลำดับในแผน คำตอบจึงไม่มีวิชาที่ลงได้แต่ถูกข้าม */
        private void fill() {
            Arrays.fill(choice, SKIP);
            placed.clear();
            planMajor = plan = minor = credits = 0;
            for (int i = 0; i < items.size(); i++) {
                if (bestChoice[i] != SKIP) {
                    place(i, bestChoice[i]);
                }
            }
            for (int i = 0; i < items.size(); i++) {
                if (choice[i] == SKIP) {
                    int g = firstFit(items.get(i));
                    if (g != SKIP) {
                        place(i, g);
                    }
                }
            }
            bestChoice = choice.clone();
        }

        private int firstFit(Item item) {
            if (credits + item.credits() > creditBudget) {
                return SKIP;
            }
            for (int g = 0; g < item.groups().size(); g++) {
                if (fits(item.groups().get(g))) {
                    return g;
                }
            }
            return SKIP;
        }

        private boolean fits(Section section) {
            for (Section p : placed) {
                if (ScheduleOverlap.conflicts(section, p)) {
                    return false;
                }
            }
            return true;
        }

        private void place(int index, int group) {
            Item item = items.get(index);
            choice[index] = group;
            placed.add(item.groups().get(group));
            if (item.isPlanMajor()) {
                planMajor++;
            }
            if (item.isPlan()) {
                plan++;
            } else {
                minor++;
            }
            credits += item.credits();
        }

        private void unplace(int index) {
            Item item = items.get(index);
            placed.remove(item.groups().get(choice[index]));
            choice[index] = SKIP;
            if (item.isPlanMajor()) {
                planMajor--;
            }
            if (item.isPlan()) {
                plan--;
            } else {
                minor--;
            }
            credits -= item.credits();
        }

        private Score score() {
            return new Score(planMajor, plan, minor, credits);
        }

        /** เกณฑ์ข้อ 5 เทียบตามลำดับในแผน ข้าม ({@link #SKIP}) ถือว่ามากกว่าทุกกลุ่ม */
        private static int compareTieBreak(int[] a, int[] b) {
            return Arrays.compare(a, b);
        }
    }
}
