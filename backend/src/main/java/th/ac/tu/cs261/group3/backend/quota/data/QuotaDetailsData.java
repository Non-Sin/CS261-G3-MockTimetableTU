package th.ac.tu.cs261.group3.backend.quota.data;

import th.ac.tu.cs261.group3.backend.quota.dto.QuotaChannelResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaConditionResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaContactResponse;
import th.ac.tu.cs261.group3.backend.quota.dto.QuotaRoundResponse;

import java.util.List;

/**
 * ผลอ่านรายละเอียดหนึ่งวิชาในภาคที่ขอ
 * quotaRequired = null หมายถึงไม่มี quota info ซึ่งต่างจาก false (ไม่ต้องขอ)
 * รายการรอบต้องกรองปี/ภาคมาแล้ว ส่วน offeredSemesters เป็นของทั้งปี
 */
public record QuotaDetailsData(
        List<Integer> offeredSemesters,
        Boolean quotaRequired,
        List<QuotaConditionResponse> conditions,
        List<QuotaRoundResponse> rounds,
        List<QuotaChannelResponse> channels,
        List<QuotaContactResponse> contacts) {

    public QuotaDetailsData {
        offeredSemesters = List.copyOf(offeredSemesters);
        conditions = List.copyOf(conditions);
        rounds = List.copyOf(rounds);
        channels = List.copyOf(channels);
        contacts = List.copyOf(contacts);
    }
}
