package th.ac.tu.cs261.group3.backend.auth.tu;

import org.springframework.http.HttpStatus;
import th.ac.tu.cs261.group3.backend.common.exception.BusinessRuleException;

/**
 * ตรวจ username/password กับ TU Login API
 * <p>
 * แยกเป็น interface เพื่อให้ Postman และ dev ใช้ {@link StubTuApiClient} (profile {@code stub-tu}) ได้
 * โดยไม่ต้องมี Application-Key และบัญชี มธ. จริง
 */
public interface TuApiClient {

    String TU_API_UNAVAILABLE = "TU_API_UNAVAILABLE";

    /**
     * รหัสผิดหรือไม่มีบัญชีคืน {@code status=false} ไม่โยน exception
     * ถ้า TU API ใช้งานไม่ได้ (key ผิด, timeout, 5xx) โยน BusinessRuleException 503 {@code TU_API_UNAVAILABLE}
     */
    TuAuthDto verifyCredentials(String username, String password);

    static BusinessRuleException unavailable() {
        return new BusinessRuleException(HttpStatus.SERVICE_UNAVAILABLE, TU_API_UNAVAILABLE,
                "ไม่สามารถเชื่อมต่อระบบของมหาวิทยาลัยได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง", null);
    }
}
