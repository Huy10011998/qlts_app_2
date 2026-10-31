import { getMeetingHeaderLabel } from "../src/screens/ShareholdersMeeting/shared/shareholdersMeetingHelpers";

describe("tên đại hội trên dòng phụ của header", () => {
  it("bỏ phần đầu trùng tiêu đề Đại hội cổ đông", () => {
    expect(
      getMeetingHeaderLabel("ĐẠI HỘI ĐỒNG CỔ ĐÔNG THƯỜNG NIÊN NĂM 2027"),
    ).toBe("THƯỜNG NIÊN NĂM 2027");
    expect(getMeetingHeaderLabel("Đại hội cổ đông bất thường lần 1")).toBe(
      "bất thường lần 1",
    );
  });

  it("tên khác dạng thì giữ nguyên, rỗng thì rỗng", () => {
    expect(getMeetingHeaderLabel("ĐHĐCĐ thường niên 2027")).toBe(
      "ĐHĐCĐ thường niên 2027",
    );
    expect(getMeetingHeaderLabel("ĐẠI HỘI ĐỒNG CỔ ĐÔNG")).toBe(
      "ĐẠI HỘI ĐỒNG CỔ ĐÔNG",
    );
    expect(getMeetingHeaderLabel(undefined)).toBe("");
  });
});
