package th.ac.tu.cs261.group3.backend.item;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import th.ac.tu.cs261.group3.backend.common.exception.ResourceNotFoundException;
import th.ac.tu.cs261.group3.backend.item.dto.ItemRequest;
import th.ac.tu.cs261.group3.backend.item.dto.ItemResponse;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ItemService {

    private final ItemRepository itemRepository;

    public List<ItemResponse> findAll() {
        return itemRepository.findAll(Sort.by("id")).stream()
                .map(ItemResponse::from)
                .toList();
    }

    public ItemResponse findById(Long id) {
        return ItemResponse.from(getItemOrThrow(id));
    }

    @Transactional
    public ItemResponse create(ItemRequest request) {
        Item item = new Item();
        item.setName(request.name());
        item.setDescription(request.description());
        return ItemResponse.from(itemRepository.saveAndFlush(item));
    }

    @Transactional
    public ItemResponse update(Long id, ItemRequest request) {
        Item item = getItemOrThrow(id);
        item.setName(request.name());
        item.setDescription(request.description());
        return ItemResponse.from(itemRepository.saveAndFlush(item));
    }

    @Transactional
    public void delete(Long id) {
        itemRepository.delete(getItemOrThrow(id));
    }

    private Item getItemOrThrow(Long id) {
        return itemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found with id: " + id));
    }
}
