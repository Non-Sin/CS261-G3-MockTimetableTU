package th.ac.tu.cs261.group3.backend.item.dto;

import th.ac.tu.cs261.group3.backend.item.Item;

import java.time.LocalDateTime;

public record ItemResponse(
        Long id,
        String name,
        String description,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static ItemResponse from(Item item) {
        return new ItemResponse(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
