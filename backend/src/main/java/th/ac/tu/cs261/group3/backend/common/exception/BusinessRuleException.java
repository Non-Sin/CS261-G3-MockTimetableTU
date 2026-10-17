package th.ac.tu.cs261.group3.backend.common.exception;

import org.springframework.http.HttpStatus;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * ใช้เมื่อคำขอถูกต้องตามรูปแบบแต่ขัดกฎทางธุรกิจ เช่น วิชาซ้ำ หรือหน่วยกิตเกิน
 * <p>
 * GlobalExceptionHandler แปลงเป็น ProblemDetail ที่มี property {@code code}
 * ให้ UI เลือกข้อความได้ และใส่ {@code properties} เพิ่มเข้าไปใน body
 */
public class BusinessRuleException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, Object> properties;

    public BusinessRuleException(HttpStatus status, String code, String detail, Map<String, Object> properties) {
        super(detail);
        this.status = status;
        this.code = code;
        // LinkedHashMap รักษาลำดับ property ใน JSON และรับค่า null ได้ต่างจาก Map.copyOf
        this.properties = properties == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(properties));
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    public Map<String, Object> getProperties() {
        return properties;
    }
}
