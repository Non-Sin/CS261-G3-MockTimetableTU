import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuotaChannelBox from "./QuotaChannelBox";
import { COURSE_MA211, COURSE_MULTI_CHANNELS } from "./quotaFixtures";

describe("QuotaChannelBox", () => {
  it("UT-UI-19 ปุ่มช่องทางเปิดแท็บใหม่และมี rel ปลอดภัย", () => {
    render(<QuotaChannelBox channels={COURSE_MA211.channels} />);
    expect(screen.getByText("ผ่าน Google Form")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "ไปยัง forms.gle" });
    expect(link).toHaveAttribute("href", "https://forms.gle/NWTyPnsVWtyDak3W8");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("UT-UI-20 หลายช่องทางในกล่องเดียว: ช่องทางไม่มี URL แสดง label และ note แต่ไม่มีลิงก์", () => {
    render(<QuotaChannelBox channels={COURSE_MULTI_CHANNELS.channels} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link")).toHaveAttribute("target", "_blank");
    expect(screen.getByText("ยื่นเอกสารที่คณะ")).toBeInTheDocument();
    expect(screen.getByText("ห้องบริการการศึกษา ชั้น 2")).toBeInTheDocument();
  });

  it("ไม่แสดงลิงก์ที่ไม่ใช่ https:// (กัน javascript: และ http)", () => {
    render(
      <QuotaChannelBox
        channels={[
          { channelType: "OTHER", label: "ลิงก์อันตราย", url: "javascript:alert(1)", note: null },
          { channelType: "OTHER", label: "ลิงก์ http", url: "http://example.com", note: null },
        ]}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("label ว่างใช้ข้อความสำรองตาม channelType", () => {
    render(<QuotaChannelBox channels={[{ channelType: "INSTRUCTOR", label: "", url: null, note: null }]} />);
    expect(screen.getByText("ติดต่ออาจารย์ผู้สอนโดยตรง")).toBeInTheDocument();
  });
});
