package th.ac.tu.cs261.group3.backend.quota.dto;

import th.ac.tu.cs261.group3.backend.quota.QuotaChannelType;

public record QuotaChannelResponse(QuotaChannelType channelType, String label, String url, String note) {
}
