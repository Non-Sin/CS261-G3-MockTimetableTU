package th.ac.tu.cs261.group3.backend.item.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ItemRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 500) String description
) {}
