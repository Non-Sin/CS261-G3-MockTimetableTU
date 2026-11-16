package th.ac.tu.cs261.group3.backend.studyplan;

import th.ac.tu.cs261.group3.backend.course.Course;

import java.util.ArrayList;
import java.util.List;

/** สร้าง entity ของ preset / วิชาโทในหน่วยความจำสำหรับ service test (entity เป็น @Immutable จึงไม่มี factory ใน main) */
final class StudyPlanEntities {

    static final String CS = "ภาควิชาวิทยาการคอมพิวเตอร์";
    static final String CUR = "หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาวิทยาการคอมพิวเตอร์ (ฉบับปรับปรุง พ.ศ. 2566)";

    private StudyPlanEntities() {
    }

    static StudyPlan plan(long id, String curriculum, int studyYear, int semester, PlanType planType, Course... courses) {
        StudyPlan plan = new StudyPlan();
        plan.setPlanId(id);
        plan.setDepartment(CS);
        plan.setCurriculumName(curriculum);
        plan.setStudyYear(studyYear);
        plan.setSemester(semester);
        plan.setPlanType(planType);
        List<StudyPlanCourse> list = new ArrayList<>();
        int order = 1;
        for (Course course : courses) {
            StudyPlanCourse pc = new StudyPlanCourse();
            pc.setPlan(plan);
            pc.setCourse(course);
            pc.setSortOrder(order++);
            list.add(pc);
        }
        plan.setCourses(list);
        return plan;
    }

    static StudyMinor minor(long id, String curriculum, String name) {
        StudyMinor minor = new StudyMinor();
        minor.setMinorId(id);
        minor.setDepartment(CS);
        minor.setCurriculumName(curriculum);
        minor.setMinorName(name);
        minor.setSortOrder((int) id);
        return minor;
    }

    static StudyMinor addCourse(StudyMinor minor, PlanType planType, int studyYear, int semester, Course course) {
        StudyMinorCourse mc = new StudyMinorCourse();
        mc.getId().setPlanType(planType);
        mc.setMinor(minor);
        mc.setCourse(course);
        mc.setStudyYear(studyYear);
        mc.setSemester(semester);
        mc.setSortOrder(minor.getCourses().size() + 1);
        minor.getCourses().add(mc);
        return minor;
    }
}
