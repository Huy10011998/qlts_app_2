export enum TypeProperty {
  String, // 0
  Text, // 1
  Int, // 2
  Decimal, // 3
  Bool, // 4
  Link, // 5
  Reference, // 6
  Date, // 7
  Time, // 8
  Image, // 9
  Enum, // 10
}

export enum SqlOperator {
  Equals, // 0
  NotEquals, // 1
  GreaterThan, // 2
  LessThan, // 3
  GreaterThanOrEqual, // 4
  LessThanOrEqual, // 5
  Contains, // 6
  StartsWith, // 7
  EndsWith, // 8
  DoesNotContain, // 9
  In, // 10
  NotIn, // 11
  IsNull, // 12
  IsNotNull, // 13
  IsEmpty, // 14
  IsNotEmpty, // 15
}

// CategoryFile
export enum CategoryFile {
  TaiLieu = "0",
  TaiChinh = "1",
  HinhAnh = "2",
  DuAn = "3",
  HopDong = "4",
  BieuMau = "5",
  KyThuat = "6",
  Video = "7",
  Khac = "8",
}

export const CategoryFiles = [
  { value: CategoryFile.TaiLieu, label: "Tài liệu" },
  { value: CategoryFile.TaiChinh, label: "Tài chính" },
  { value: CategoryFile.HinhAnh, label: "Hình ảnh" },
  { value: CategoryFile.DuAn, label: "Dự án" },
  { value: CategoryFile.HopDong, label: "Hợp đồng" },
  { value: CategoryFile.BieuMau, label: "Biểu mẫu" },
  { value: CategoryFile.KyThuat, label: "Kỹ thuật" },
  { value: CategoryFile.Video, label: "Video" },
  { value: CategoryFile.Khac, label: "Khác" },
];
