# Ảnh minh hoạ tài liệu hướng dẫn

Đặt screenshot theo tên `<topic-id>-<nn>.png`, ví dụ `quet-qr-01.png`, `xac-nhan-tu-lanh-02.png`
(`topic-id` là `id` của chủ đề trong `src/screens/Guide/shared/guideContent.ts`).

Thêm ảnh vào tài liệu bằng một block `image` trong chủ đề tương ứng:

```ts
{
  kind: "image",
  source: require("../../../assets/images/guide/quet-qr-01.png"),
  caption: "Nút Quét QR ở giữa thanh tab",
  aspectRatio: 0.5, // width / height — bỏ trống là 0.5 (ảnh chụp dọc)
}
```

Quy ước:

- Chụp ở **giao diện Sáng** cho nhất quán (màn Hướng dẫn đã ghi chú điều này ở cuối trang).
- Bề rộng tối đa ~1080px. Ảnh chụp giao diện dùng PNG, ảnh thực tế (tủ lạnh, thiết bị) dùng JPG.
- Chỉ cần một bản, không cần `@2x`/`@3x`: ảnh được scale theo bề rộng thẻ.
- Che thông tin nhạy cảm (tên khách hàng, số điện thoại) trước khi đưa vào repo.
