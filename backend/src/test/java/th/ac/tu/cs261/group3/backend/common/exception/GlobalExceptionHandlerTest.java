package th.ac.tu.cs261.group3.backend.common.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * ทดสอบว่า BusinessRuleException ถูกแปลงเป็น ProblemDetail ตาม US1 DTO & API Spec
 */
class GlobalExceptionHandlerTest {

    private final MockMvc mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @RestController
    static class ThrowingController {

        @GetMapping("/test/business-rule")
        void businessRule() {
            Map<String, Object> properties = new LinkedHashMap<>();
            properties.put("currentCredits", 21);
            properties.put("courseCredits", 3);
            properties.put("maxCredits", 22);
            throw new BusinessRuleException(HttpStatus.CONFLICT, "CREDIT_LIMIT_EXCEEDED",
                    "เพิ่ม ST216 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินกำหนด 22 หน่วยกิต", properties);
        }

        @GetMapping("/test/business-rule-no-properties")
        void businessRuleNoProperties() {
            throw new BusinessRuleException(HttpStatus.CONFLICT, "SOME_RULE", "ขัดกฎ", null);
        }
    }

    @Test
    void businessRule_returnsProblemDetailWithCodeAndProperties() throws Exception {
        mockMvc.perform(get("/test/business-rule"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.title").value("Conflict"))
                .andExpect(jsonPath("$.detail").value("เพิ่ม ST216 (3 หน่วยกิต) แล้วจะเป็น 24 หน่วยกิต เกินกำหนด 22 หน่วยกิต"))
                .andExpect(jsonPath("$.code").value("CREDIT_LIMIT_EXCEEDED"))
                .andExpect(jsonPath("$.currentCredits").value(21))
                .andExpect(jsonPath("$.courseCredits").value(3))
                .andExpect(jsonPath("$.maxCredits").value(22));
    }

    @Test
    void businessRule_nullProperties_returnsCodeOnly() throws Exception {
        mockMvc.perform(get("/test/business-rule-no-properties"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SOME_RULE"))
                .andExpect(jsonPath("$.detail").value("ขัดกฎ"));
    }
}
