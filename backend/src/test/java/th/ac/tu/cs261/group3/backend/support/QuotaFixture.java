package th.ac.tu.cs261.group3.backend.support;

import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import th.ac.tu.cs261.group3.backend.course.Course;
import th.ac.tu.cs261.group3.backend.course.CourseCategory;
import th.ac.tu.cs261.group3.backend.course.Section;
import th.ac.tu.cs261.group3.backend.quota.*;

import java.time.LocalDate;
import java.time.LocalTime;

import static th.ac.tu.cs261.group3.backend.course.CourseCategory.*;
import static th.ac.tu.cs261.group3.backend.quota.QuotaChannelType.*;

/** Fixture ตาม US7-T12: ไม่ใช้ dev seed และไม่ชน fixture ของ US1/US6/US8 */
public final class QuotaFixture {

    private QuotaFixture() {
    }

    public static void persist(TestEntityManager em) {
        Course el105 = course(em, "Q7EL105", "English in Academic Context", "ภาษาอังกฤษเพื่อการสื่อสารทางวิชาการ", GENERAL_EDUCATION);
        Course ma211 = course(em, "Q7MA211", "Calculus 1", "แคลคูลัส 1", MAJOR);
        Course an347 = course(em, "Q7AN347", "Anthropology of Southeast Asia", "มานุษยวิทยาเอเชียตะวันออกเฉียงใต้", FREE_ELECTIVE);
        Course el395 = course(em, "Q7EL395", "Academic English", "ภาษาอังกฤษเชิงวิชาการ", GENERAL_EDUCATION);
        Course el295 = course(em, "Q7EL295", "Foundation English", "ภาษาอังกฤษพื้นฐาน", GENERAL_EDUCATION);
        Course pc280 = course(em, "Q7PC280", "Elementary Astronomy", "ดาราศาสตร์เบื้องต้น", GENERAL_EDUCATION);
        Course noData = course(em, "Q7NODAT", "Special Topic_100%", "หัวข้อพิเศษ 50_test!", MAJOR);
        Course off = course(em, "Q7OFF00", "Archived Course-Data", "วิชาที่ยังไม่เปิดสอน", FREE_ELECTIVE);

        section(em, el105, 2569, 1, "01");
        section(em, el105, 2569, 2, "01");
        section(em, el105, 2569, 2, "02"); // DISTINCT ต้องคืนภาค 2 ครั้งเดียว
        section(em, ma211, 2569, 2, "01");
        section(em, an347, 2569, 2, "01");
        section(em, el395, 2569, 2, "01");
        section(em, el295, 2569, 1, "01");
        section(em, pc280, 2569, 2, "01");
        section(em, noData, 2569, 2, "01");
        section(em, off, 2568, 1, "01");

        CourseQuotaInfo english = info(em, el105, true);
        CourseQuotaInfo calculus = info(em, ma211, true);
        CourseQuotaInfo anthropology = info(em, an347, true);
        CourseQuotaInfo academic = info(em, el395, true);
        info(em, el295, false);
        CourseQuotaInfo astronomy = info(em, pc280, true);

        // จงใจ insert ย้อนลำดับ เพื่อพิสูจน์ ORDER BY ไม่อาศัยลำดับ INSERT
        condition(em, academic, 2, "นักศึกษาชั้นปีที่ 2 ขึ้นไป", null);
        condition(em, academic, 1, "ต้องสอบได้วิชา Q7EL295", "Q7EL295");
        channel(em, english, 3, FACULTY_OFFICE, "ติดต่อห้องธุรการสถาบันภาษา", null, "วันจันทร์-ศุกร์ 09:00-15:00");
        channel(em, english, 2, ONLINE_FORM, "กรอก Google Form สำรอง", "https://forms.gle/example", "สำหรับกรณีเข้าระบบไม่ได้");
        channel(em, english, 1, QUOTA_SYSTEM, "ผ่านระบบโควตา LITU", "https://litu.tu.ac.th/quota", null);
        channel(em, astronomy, 1, INSTRUCTOR, "ติดต่ออาจารย์ผู้สอน", null, "ติดต่ออาจารย์ผู้สอน");
        contact(em, english, "สถาบันภาษา", "Facebook LITU", "https://facebook.com/litu");
        contact(em, astronomy, "สาขาวิชาฟิสิกส์", "MS Teams wchumpon@tu.ac.th", null);

        round(em, english, 2569, 2, 2, "รอบที่ 2", "2026-10-15", "2026-10-16", null, null);
        round(em, english, 2569, 2, 1, "รอบที่ 1", "2026-10-05", "2026-10-09", null, null);
        round(em, english, 2568, 1, 1, "รอบปีก่อน", "2025-08-04", "2025-08-08", null, null);
        round(em, calculus, 2569, 2, 1, null, null, "2026-10-20", null, "15:00");
        String[] labels = {"รหัส 65-66", "รหัส 67", "รหัส 68", "รหัส 69"};
        for (int i = 4; i >= 1; i--) {
            round(em, anthropology, 2569, 2, i, labels[i - 1], "2026-10-12", "2026-10-12", "09:00", "16:00");
        }
        em.flush();
        em.clear();
    }

    public static Course course(TestEntityManager em, String code, String name, String nameTh, CourseCategory category) {
        Course course = new Course();
        course.setCourseCode(code);
        course.setCourseName(name);
        course.setCourseNameTh(nameTh);
        course.setCategory(category);
        course.setCredits(3);
        return em.persist(course);
    }

    private static void section(TestEntityManager em, Course course, int year, int semester, String number) {
        Section section = new Section();
        section.setCourse(course);
        section.setSectionNo(number);
        section.setAcademicYear(year);
        section.setSemester(semester);
        em.persist(section);
    }

    private static CourseQuotaInfo info(TestEntityManager em, Course course, boolean required) {
        CourseQuotaInfo info = new CourseQuotaInfo();
        info.setCourse(course);
        info.setQuotaRequired(required);
        return em.persist(info);
    }

    private static void condition(TestEntityManager em, CourseQuotaInfo info, int order, String text, String related) {
        QuotaCondition condition = new QuotaCondition();
        condition.setQuotaInfo(info);
        condition.setSortOrder(order);
        condition.setConditionText(text);
        condition.setRelatedCourseCode(related);
        em.persist(condition);
    }

    private static void channel(TestEntityManager em, CourseQuotaInfo info, int order, QuotaChannelType type,
                                String label, String url, String note) {
        QuotaChannel channel = new QuotaChannel();
        channel.setQuotaInfo(info);
        channel.setSortOrder(order);
        channel.setChannelType(type);
        channel.setLabel(label);
        channel.setUrl(url);
        channel.setNote(note);
        em.persist(channel);
    }

    private static void contact(TestEntityManager em, CourseQuotaInfo info, String organization, String label, String url) {
        QuotaContact contact = new QuotaContact();
        contact.setQuotaInfo(info);
        contact.setSortOrder(1);
        contact.setOrganizationName(organization);
        contact.setLabel(label);
        contact.setUrl(url);
        em.persist(contact);
    }

    private static void round(TestEntityManager em, CourseQuotaInfo info, int year, int semester, int number,
                              String label, String start, String end, String startTime, String endTime) {
        QuotaRound round = new QuotaRound();
        round.setQuotaInfo(info);
        round.setAcademicYear(year);
        round.setSemester(semester);
        round.setRoundNo(number);
        round.setLabel(label);
        round.setStartDate(start == null ? null : LocalDate.parse(start));
        round.setEndDate(LocalDate.parse(end));
        round.setStartTime(startTime == null ? null : LocalTime.parse(startTime));
        round.setEndTime(endTime == null ? null : LocalTime.parse(endTime));
        em.persist(round);
    }
}
