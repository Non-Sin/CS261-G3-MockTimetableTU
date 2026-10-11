package th.ac.tu.cs261.group3.backend.item;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.item.dto.ItemRequest;
import th.ac.tu.cs261.group3.backend.item.dto.ItemResponse;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller test แบบไม่ต้องใช้ฐานข้อมูล (mock ItemService)
 */
@WebMvcTest(ItemController.class)
class ItemControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ItemService itemService;

    private final LocalDateTime now = LocalDateTime.of(2026, 1, 1, 12, 0);

    @Test
    void findAll_returnsItems() throws Exception {
        when(itemService.findAll()).thenReturn(List.of(
                new ItemResponse(1L, "ปากกา", null, now, now)));

        mockMvc.perform(get("/api/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("ปากกา"));
    }

    @Test
    void findById_notFound_returns404() throws Exception {
        when(itemService.findById(99L)).thenThrow(new ResourceNotFoundException("Item not found with id: 99"));

        mockMvc.perform(get("/api/items/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("Item not found with id: 99"));
    }

    @Test
    void create_valid_returns201() throws Exception {
        when(itemService.create(any(ItemRequest.class)))
                .thenReturn(new ItemResponse(1L, "ปากกา", "สีน้ำเงิน", now, now));

        mockMvc.perform(post("/api/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"ปากกา\",\"description\":\"สีน้ำเงิน\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("ปากกา"));
    }

    @Test
    void create_blankName_returns400WithFieldError() throws Exception {
        mockMvc.perform(post("/api/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists());
    }

    @Test
    void create_malformedJson_returns400ProblemDetailWithoutTrace() throws Exception {
        mockMvc.perform(post("/api/items")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{bad"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void findById_nonNumericId_returns400() throws Exception {
        mockMvc.perform(get("/api/items/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }
}
