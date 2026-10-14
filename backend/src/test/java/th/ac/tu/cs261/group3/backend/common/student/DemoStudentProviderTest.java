package th.ac.tu.cs261.group3.backend.common.student;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DemoStudentProviderTest {

    @Test
    void currentStudentId_returnsConfiguredId() {
        CurrentStudentProvider provider = new DemoStudentProvider("6609000000");

        assertEquals("6609000000", provider.currentStudentId());
    }
}
