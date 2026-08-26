import { C } from "../../../utils/helpers/colors";
import type { GuideTopic } from "./guideTypes";

/**
 * Câu hỏi thường gặp — một chủ đề đặc biệt: mỗi section là một câu hỏi, gập lại
 * mặc định (`collapsibleSections`) để cả danh sách câu hỏi nhìn thấy được trong
 * một màn, người dùng chỉ mở câu của mình.
 *
 * Câu trả lời trích đúng thông báo lỗi app hiện ra, để người dùng đối chiếu được
 * chữ trên màn hình với chữ trong tài liệu.
 */
export const GUIDE_FAQ_TOPIC: GuideTopic = {
  id: "faq",
  title: "Câu hỏi thường gặp",
  summary: "Lỗi kết nối, hết phiên, quyền, GPS, camera",
  iconName: "help-circle-outline",
  iconBg: C.violet,
  group: "Trợ giúp",
  collapsibleSections: true,
  keywords: [
    "faq",
    "cau hoi",
    "loi",
    "khong ket noi",
    "het phien",
    "quyen",
    "gps",
    "camera",
    "vuot the",
    "them nhanh",
  ],
  sections: [
    {
      id: "faq-khong-ket-noi",
      heading: 'App báo "Không thể kết nối đến máy chủ"',
      blocks: [
        {
          kind: "paragraph",
          text: "Máy chủ của hệ thống nằm trong mạng nội bộ công ty, nên máy phải ở đúng mạng đó mới gọi được.",
        },
        {
          kind: "steps",
          items: [
            "Kiểm tra máy đang nối Wi-Fi công ty, không phải 4G hay Wi-Fi khác.",
            "Trên iPhone/iPad: mở Cài đặt trong app, xem dòng Quyền mạng nội bộ đã ở trạng thái Đã cấp quyền chưa.",
            "Bấm Thử lại. Nếu vẫn không được và đồng nghiệp cùng phòng cũng vậy thì máy chủ đang có vấn đề — liên hệ IT.",
          ],
        },
      ],
    },
    {
      id: "faq-het-phien",
      heading: 'App báo "Phiên đăng nhập đã hết"',
      blocks: [
        {
          kind: "paragraph",
          text: "Phiên làm việc có thời hạn; hết hạn là app đưa về màn Đăng nhập. Đăng nhập lại bằng tài khoản hoặc Face ID là dùng tiếp được.",
        },
        {
          kind: "paragraph",
          text: "Những gì đã bấm Gửi trước đó vẫn nằm trên máy chủ, không mất. Chỉ phần đang nhập dở dang là phải làm lại.",
        },
      ],
    },
    {
      id: "faq-faceid",
      heading: 'Bấm Face ID thì báo "FaceID chưa bật"',
      blocks: [
        {
          kind: "paragraph",
          text: "Face ID phải được bật một lần cho từng tài khoản, trên từng máy.",
        },
        {
          kind: "steps",
          items: [
            "Đăng nhập bằng tài khoản và mật khẩu.",
            "Vào tab Cài đặt → bật Đăng nhập FaceID và xác thực khuôn mặt.",
            "Đăng xuất rồi thử nút Face ID lại.",
          ],
        },
      ],
    },
    {
      id: "faq-camera-bi-chan",
      heading: "Quyền camera hiện Đã chặn quyền, không quét được QR",
      blocks: [
        {
          kind: "paragraph",
          text: "Khi quyền đã bị chặn, hệ điều hành không cho app xin lại nữa, phải bật tay trong Cài đặt của điện thoại.",
        },
        {
          kind: "steps",
          items: [
            "Vào tab Cài đặt trong app và bấm vào dòng Quyền camera — app đưa bạn tới đúng trang cài đặt của hệ thống.",
            "Bật lại quyền Camera cho ứng dụng.",
            "Quay lại app; trạng thái đổi thành Đã cấp quyền là quét được.",
          ],
        },
      ],
    },
    {
      id: "faq-gps",
      heading: "Không lấy được toạ độ khi xác nhận vị trí tủ lạnh",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Bật Định vị / Location của điện thoại, và cho ứng dụng quyền vị trí khi máy hỏi.",
            "Đứng chỗ thoáng trời vài giây — trong kho kín hoặc giữa nhà cao tầng thì máy rất lâu mới có toạ độ.",
            "Toạ độ hiện ra rồi hãy bấm Gửi, để bản ghi có đúng vị trí nơi bạn đang đứng.",
          ],
        },
      ],
    },
    {
      id: "faq-thieu-chuc-nang",
      heading: "Không thấy chức năng hoặc không thấy nút Thêm / Sửa / Xoá",
      blocks: [
        {
          kind: "paragraph",
          text: "App ẩn hẳn những gì tài khoản không có quyền, thay vì hiện ra rồi báo lỗi. Vì vậy thiếu một chức năng hay thiếu một nút gần như luôn là do phân quyền, không phải lỗi ứng dụng.",
        },
        {
          kind: "paragraph",
          text: "Liên hệ IT, nói rõ tên chức năng và việc cần làm (xem, thêm, sửa hay xoá) để được cấp đúng quyền.",
        },
      ],
    },
    {
      id: "faq-camera-khong-len-hinh",
      heading: "Camera không lên hình",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Kiểm tra máy đang ở mạng nội bộ công ty — ra ngoài mạng là không xem được camera.",
            "Thoát màn camera rồi vào lại để app kết nối luồng hình mới.",
            "Xem lưới Live View nhiều camera một lúc trên mạng yếu thì hình dễ đứng; xem từng camera một sẽ mượt hơn.",
          ],
        },
      ],
    },
    {
      id: "faq-qr-khong-nhan",
      heading: "Quét mãi không nhận mã QR",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Lau sạch tem và mặt kính camera.",
            "Đổi góc để tránh bóng đèn phản lên tem; đưa xa/gần cho tem nằm gọn trong khung ngắm.",
            "Tem bị dán chồng, xé mất góc hoặc mờ hẳn thì không đọc được — tìm thiết bị theo danh sách tài sản và báo bộ phận quản lý in tem mới.",
          ],
        },
      ],
    },
    {
      id: "faq-vuot-the-khong-ra-nut",
      heading: "Vuốt dòng ở danh sách tài sản không thấy nút nào",
      blocks: [
        {
          kind: "paragraph",
          text: "Nút vuốt là đường tắt để thêm bản ghi con, nên nó chỉ có ở danh sách của loại tài sản thật sự có danh mục con.",
        },
        {
          kind: "bullets",
          items: [
            "Không có dòng nhắc màu đỏ nhạt dưới ô tìm kiếm nghĩa là danh sách đó không vuốt được.",
            "Loại tài sản không khai báo danh mục con nào — ví dụ danh sách phiếu đánh giá — thì không có gì để thêm bên dưới nữa.",
            "Có danh mục con nhưng tài khoản chưa có quyền thêm ở đó thì nút cũng ẩn; liên hệ IT để được cấp quyền.",
          ],
        },
        {
          kind: "paragraph",
          text: "Muốn biết một loại tài sản có danh mục con nào: mở một bản ghi rồi xem tab Chi tiết — đúng danh sách đó là những gì vuốt để thêm nhanh được.",
        },
      ],
    },
    {
      id: "faq-cap-nhat",
      heading: "Làm sao biết app đã là bản mới nhất?",
      blocks: [
        {
          kind: "paragraph",
          text: "Vào tab Cài đặt, khối THÔNG TIN ỨNG DỤNG hiện phiên bản đang cài và tự kiểm tra bản mới. Khi có bản mới, nút Cập nhật hiện ra và mở thẳng App Store / Google Play.",
        },
      ],
    },
  ],
};
