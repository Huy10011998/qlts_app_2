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
  summary: "Lỗi kết nối, hết phiên, quyền, GPS, camera, Workflow, danh thiếp QR",
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
    "phat lai",
    "phong to",
    "zoom",
    "toan man hinh",
    "vuot the",
    "them nhanh",
    "thanh thao tac",
    "chon thao tac",
    "danh gia",
    "quet lien tuc",
    "tao moi thanh cong",
    "bang chon",
    "dau cong",
    "them nhanh danh muc",
    "khong co trong danh sach",
    "o chon van trong",
    "thong bao camera",
    "khong nhan duoc thong bao",
    "ai phat hien",
    "phat hien doi tuong",
    "chay khoi",
    "hut thuoc",
    "chuyen dong",
    "tam dung thong bao",
    "tat rieng mot camera",
    "ca cong ty",
    "o chon mo",
    "o chon xam",
    "bam khong duoc",
    "chon cap tren truoc",
    "cap cha",
    "khong sua duoc",
    "dien san",
    "tu dien gia tri",
    "gia tri mac dinh",
    "danh sach con it dong",
    "thieu dong",
    "o xam nhap nhay",
    "khung cho",
    "dang tai",
    "danh thiep",
    "thong tin qrcode",
    "khong co ma qr",
    "luu danh ba",
    "ho so sai",
    "thong tin cu",
    "khong tim thay tai khoan",
    "o so lieu",
    "chi hien mot nhanh",
    "workflow",
    "khong thay workflow",
    "tab lich",
    "mat tab camera",
    "chuong thong bao",
    "sap trien khai",
    "chua lien ket nhan vien",
    "phieu de nghi",
    "khong co nut duyet",
    "tu choi nham",
    "duyet tat ca",
    "duyet theo dot",
    "cong viec",
    "gia han",
    "doi chu tri",
    "xoa cong viec",
    "xoa ke hoach",
    "file qua lon",
    "20mb",
    "thong bao day",
    "da doc",
    "viec cua dong nghiep",
    "dinh ky",
    "ban do trang",
    "ban do iphone",
    "co chu",
    "chu nho",
    "chu to",
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
      id: "faq-khong-phong-to-duoc-camera",
      heading: "Chụm hai ngón mà hình camera không phóng to",
      blocks: [
        {
          kind: "paragraph",
          text: "Phóng to bằng hai ngón chỉ dùng được ở màn Phát lại và khi đang bật toàn màn hình. Đang xem ở khung nhỏ hoặc đang ở lưới Live View thì thao tác này không có tác dụng.",
        },
        {
          kind: "bullets",
          items: [
            "Ở lưới Live View: chạm hai lần vào một ô để phóng ô đó ra toàn màn hình, chạm hai lần nữa để về lưới.",
            "Ở màn Phát lại: bật toàn màn hình rồi mới chụm hai ngón; kéo để xem phần bị che.",
            "Thu nhỏ hết cỡ là hình tự trở về đúng khuôn ban đầu, không cần chỉnh tay.",
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
      id: "faq-mat-muc-danh-gia",
      heading: "Dấu ba chấm không còn mục Đánh giá / Trung chuyển nữa",
      blocks: [
        {
          kind: "paragraph",
          text: "Những việc này đã chuyển xuống thanh dưới đáy màn chi tiết, không mất đi. Dấu ba chấm giờ chỉ còn thao tác quản trị bản ghi: Bản sao và Xoá.",
        },
        {
          kind: "bullets",
          items: [
            "Thiết bị chỉ làm được một việc: nút đỏ dưới đáy ghi thẳng tên việc, ví dụ Đánh giá.",
            "Thiết bị làm được nhiều việc: nút ghi Chọn thao tác kèm số việc, bấm ra bảng chọn.",
          ],
        },
        {
          kind: "paragraph",
          text: "Đưa ra ngoài vì đây là việc làm nhiều nhất sau khi quét, giấu sau một lần bấm là sai chỗ.",
        },
      ],
    },
    {
      id: "faq-bang-tu-mo",
      heading: "Quét xong tự hiện bảng hỏi làm gì, tôi chỉ muốn xem thông tin",
      blocks: [
        {
          kind: "paragraph",
          text: "Bấm ra ngoài bảng để đóng, màn Thông tin của thiết bị nằm ngay dưới đó. Bảng chỉ tự mở khi vào từ máy quét và thiết bị có từ hai việc trở lên.",
        },
        {
          kind: "bullets",
          items: [
            "Mở thiết bị từ danh sách tài sản thì bảng không bao giờ tự mở.",
            "Đóng rồi cần lại thì bấm nút Chọn thao tác trên thanh dưới đáy.",
          ],
        },
      ],
    },
    {
      id: "faq-khong-thay-tao-moi-thanh-cong",
      heading: 'Lưu xong không thấy thông báo "Tạo mới thành công"',
      blocks: [
        {
          kind: "paragraph",
          text: "Ở luồng quét QR, app không hỏi OK nữa mà quay thẳng về màn quét kèm dải xanh Đã lưu… ở trên, tự tắt sau vài giây. Bản ghi đã lưu rồi.",
        },
        {
          kind: "bullets",
          items: [
            "Muốn kiểm lại: bấm Xem trên dải xanh để mở danh sách bản ghi vừa tạo.",
            "Dải xanh tắt mất rồi thì quét lại thiết bị đó, dòng Lịch sử dưới đáy màn có số bản ghi mới nhất.",
          ],
        },
        {
          kind: "paragraph",
          text: "Bỏ bước bấm OK vì đi kiểm tra cả loạt thiết bị thì mỗi bản ghi một lần bấm là thao tác thừa nhân lên theo số thiết bị. Các luồng thêm mới khác vẫn báo như cũ.",
        },
      ],
    },
    {
      id: "faq-bang-chon-khong-co-gia-tri",
      heading: "Bảng chọn không có giá trị tôi cần",
      blocks: [
        {
          kind: "paragraph",
          text: "Bấm nút dấu + màu đỏ bên phải ô tìm kiếm trong bảng chọn: bảng đổi thành form thêm mới của chính danh mục đó, lưu xong là quay về danh sách đã có bản ghi mới. Không phải thoát form đang nhập.",
        },
        {
          kind: "paragraph",
          text: "Không thấy nút dấu +:",
        },
        {
          kind: "bullets",
          items: [
            "Tài khoản chưa có quyền thêm ở đúng danh mục đó — nhờ quản trị hệ thống cấp quyền, app không tự mở được.",
            "Ô này chọn từ danh sách cố định (Có/Không, trạng thái…) chứ không phải danh mục, loại đó chỉ sửa được ở hệ thống trên web.",
            "Gõ tìm nhưng gõ sai chính tả nên tưởng không có. Thử gõ ngắn hơn, gõ không dấu vẫn ra kết quả.",
          ],
        },
      ],
    },
    {
      id: "faq-them-nhanh-o-van-trong",
      heading: "Thêm nhanh xong mà ô chọn vẫn trống",
      blocks: [
        {
          kind: "paragraph",
          text: "Đúng như thiết kế. Tạo được một bản ghi không có nghĩa là đã chọn nó, nên app chỉ tải lại danh sách chứ không tự điền — bản ghi vừa tạo nằm trong đó, chạm vào là chọn.",
        },
        {
          kind: "paragraph",
          text: "Đã bấm OK ở thông báo Tạo mới thành công mà không thấy bản ghi trong danh sách thì gõ tên nó vào ô tìm kiếm. Bản ghi đã lưu trên máy chủ rồi, không cần tạo lại — tạo lại là trùng dữ liệu.",
        },
        {
          kind: "note",
          tone: "info",
          text: "Danh mục có cấp trên thì form thêm nhanh đã điền sẵn và khoá chuỗi cấp trên đang chọn ở form ngoài, nên bản ghi mới chắc chắn nằm trong danh sách vừa tải lại. Nếu bạn tự đổi mấy ô đó được (danh mục không có cấp trên) thì bản ghi vẫn nằm trong danh sách, chỉ cần gõ tìm.",
        },
      ],
    },
    {
      id: "faq-o-chon-bi-mo",
      heading: "Ô chọn bị mờ, bấm không mở được bảng chọn",
      blocks: [
        {
          kind: "paragraph",
          text: "Ô đó phụ thuộc cấp trên và cấp trên chưa được chọn. Chính ô mờ có ghi cần chọn gì trước — ví dụ Vui lòng chọn Toà nhà, Tầng trước. Chọn đủ mấy ô đó là ô này tự mở.",
        },
        {
          kind: "paragraph",
          text: "Chuỗi hay gặp là Khu → Toà nhà → Tầng → Phòng, phải đi từ trên xuống.",
        },
        {
          kind: "note",
          tone: "warn",
          text: "Đây không phải lỗi và cũng không phải thiếu quyền. Trước đây ô vẫn bấm được nhưng danh sách bên trong trả về sai — toàn những mục không thuộc cấp nào — chọn vào là lưu sai chỗ mà không có báo lỗi. Nay app khoá lại để không chọn nhầm được.",
        },
        {
          kind: "bullets",
          items: [
            "Đã chọn đủ cấp trên mà ô vẫn mờ: kéo xuống nạp lại màn, hoặc thoát form vào lại.",
            "Vẫn mờ sau khi vào lại thì báo IT kèm tên loại tài sản và tên ô — có thể dữ liệu cấp trên của bản ghi đó đang trống trên máy chủ.",
          ],
        },
      ],
    },
    {
      id: "faq-o-dien-san-khong-sua-duoc",
      heading: "Ô đã điền sẵn mà mờ, không sửa được",
      blocks: [
        {
          kind: "paragraph",
          text: "Gặp ở hai chỗ, cùng một lý do: mấy ô đó chỉ ra bản ghi đang đứng, sửa tay là dữ liệu nhảy sang chỗ khác.",
        },
        {
          kind: "bullets",
          items: [
            "Thêm bản ghi con (vuốt dòng, hoặc thanh thao tác dưới đáy màn chi tiết): các ô chỉ ra thiết bị cha — Khu, Toà nhà, Tầng, Phòng… — được điền sẵn và khoá.",
            "Thêm nhanh một danh mục có cấp trên từ bảng chọn: chuỗi cấp trên đang chọn ở form ngoài được mang xuống và khoá.",
          ],
        },
        {
          kind: "paragraph",
          text: "Cần thêm bản ghi cho một thiết bị khác thì thoát ra, mở đúng thiết bị đó rồi thêm lại — chứ không sửa mấy ô này.",
        },
      ],
    },
    {
      id: "faq-form-tu-dien-gia-tri",
      heading: "Mở form thêm mới thì một số ô đã có sẵn giá trị",
      blocks: [
        {
          kind: "paragraph",
          text: "Đó là giá trị mặc định do bộ phận quản lý khai cho từng loại tài sản: ngày nhập lấy ngày hôm nay, giờ lấy giờ hiện tại của máy, đơn vị tiền tệ lấy loại hay dùng nhất… Mục đích là đỡ phải nhập lại những thứ gần như luôn giống nhau.",
        },
        {
          kind: "bullets",
          items: [
            "Đây là gợi ý, không phải bắt buộc — sửa lại bình thường trước khi lưu.",
            "Màn Chỉnh sửa và Bản sao KHÔNG tự điền gì, giữ nguyên giá trị bản ghi cũ.",
            "Thấy giá trị mặc định sai với thực tế phòng ban mình thì báo bộ phận quản lý sửa ở hệ thống trên web, app không đổi được.",
          ],
        },
        {
          kind: "paragraph",
          text: "App điền giống hệt bản web, nên bản ghi tạo từ điện thoại và tạo từ máy tính ra cùng dữ liệu.",
        },
      ],
    },
    {
      id: "faq-danh-sach-con-it-dong",
      heading: "Danh sách bản ghi con ít dòng hơn trước",
      blocks: [
        {
          kind: "paragraph",
          text: "Danh sách giờ lọc đúng theo bản ghi cha đang mở. Trước đây có trường hợp lọt cả bản ghi của thiết bị khác cùng loại vào — ví dụ mở linh kiện của một máy tính lại thấy lẫn linh kiện của máy chủ. Số dòng giảm là do bỏ những dòng vốn không thuộc thiết bị này.",
        },
        {
          kind: "bullets",
          items: [
            "Con số ở dòng Lịch sử… dưới đáy màn chi tiết cũng đếm theo cách đó, nên khớp với số dòng mở ra.",
            "Kéo xuống làm mới nếu vừa thêm bản ghi ở nơi khác.",
          ],
        },
        {
          kind: "note",
          tone: "info",
          text: "Danh sách hiện Không có dữ liệu trong khi bạn biết chắc có bản ghi: kéo xuống nạp lại một lần. Vẫn trống thì báo IT kèm tên loại tài sản và mã thiết bị cha — có thể phần khai báo cha-con của loại đó đang chặn, app hiện đúng như máy chủ trả về.",
        },
      ],
    },
    {
      id: "faq-o-xam-khi-mo-man",
      heading: "Mở màn hình thấy mấy ô xám rồi mới ra dữ liệu",
      blocks: [
        {
          kind: "paragraph",
          text: "Đó là khung chờ, vẽ đúng khung của nội dung sắp hiện ra trong lúc app tải dữ liệu. Nó thay cho vòng xoay tròn giữa màn để mắt không phải nhảy chỗ khi dữ liệu về.",
        },
        {
          kind: "bullets",
          items: [
            "Khung chờ chỉ hiện khi màn còn trống. Đã có dữ liệu cũ thì app tải lại âm thầm, danh sách đứng yên để không mất chỗ đang đọc.",
            "Kéo xuống làm mới hoặc gõ tìm kiếm thì không vẽ khung chờ — hai chỗ đó đã có dấu hiệu đang chạy riêng.",
            "Khung xám đứng mãi không ra dữ liệu là mạng chậm hoặc mất mạng, không phải màn hình bị treo. Chờ vài giây, hoặc kiểm tra Wi-Fi công ty.",
          ],
        },
      ],
    },
    {
      id: "faq-khong-thay-thanh-thao-tac",
      heading: "Không thấy thanh thao tác dưới đáy màn chi tiết",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Loại tài sản đó chưa khai danh mục con nào và cũng không có nghiệp vụ riêng — không có việc gì để làm.",
            "Có danh mục con nhưng tài khoản chưa có quyền thêm ở đó thì thanh cũng ẩn hẳn, thay vì hiện rồi báo lỗi khi bấm.",
            "Đang mất mạng thì app chưa lấy được danh sách việc; kéo xuống nạp lại sau khi có mạng.",
          ],
        },
        {
          kind: "paragraph",
          text: "Muốn biết một loại tài sản có việc gì: mở một bản ghi rồi xem tab Chi tiết.",
        },
      ],
    },
    {
      id: "faq-khong-nhan-thong-bao-camera",
      heading: "Không nhận được thông báo camera",
      blocks: [
        {
          kind: "paragraph",
          text: "Kiểm tra lần lượt theo thứ tự này, phần lớn trường hợp dừng ở bước 1 hoặc 2.",
        },
        {
          kind: "steps",
          items: [
            "Vào tab Cài đặt xem có dòng Thông báo camera không. Không thấy nghĩa là tài khoản chưa được cấp quyền — nhờ IT thêm quyền nhận thông báo camera.",
            "Vẫn ở Cài đặt, xem dòng Quyền thông báo đã ở trạng thái Đã cấp quyền chưa. Đang bị chặn thì bấm vào dòng đó để mở Cài đặt của điện thoại.",
            "Mở Thông báo camera, xem phần trạng thái có đang Tạm dừng không — kể cả lệnh do người khác tắt cho cả công ty. Phần Phạm vi cho biết lệnh đang tắt tất cả camera hay chỉ một camera.",
            "Ba bước trên đều ổn mà vẫn không có thì đóng hẳn app rồi mở lại một lần, app sẽ đăng ký lại với máy chủ.",
          ],
        },
        {
          kind: "paragraph",
          text: "Đến đây vẫn không được thì báo IT kèm tên tài khoản và giờ bạn thử, để bên kỹ thuật tra lại nhật ký gửi thông báo.",
        },
      ],
    },
    {
      id: "faq-thong-bao-camera-ca-cong-ty",
      heading: "Cả phòng không ai nhận được thông báo camera",
      blocks: [
        {
          kind: "paragraph",
          text: "Nhiều khả năng có người đã đặt tạm dừng cho cả công ty. Vào tab Cài đặt, chọn Thông báo camera — nếu đúng vậy thì phần trạng thái ghi rõ cả công ty, kèm tên người tắt, lý do và còn bao lâu.",
        },
        {
          kind: "paragraph",
          text: "Cần nhận lại ngay thì bấm Bật lại ngay; app hỏi xác nhận vì thao tác này khôi phục thông báo cho tất cả mọi người. Nên hỏi người đã tắt một câu trước khi bật lại, tránh bật giữa lúc họ đang thi công.",
        },
      ],
    },
    {
      id: "faq-tam-dung-het-han",
      heading: "Tạm dừng thông báo camera có tự hết không?",
      blocks: [
        {
          kind: "paragraph",
          text: "Có. Hết mốc thời gian đã chọn là app tự nhận thông báo trở lại, không phải bật tay. Màn Thông báo camera đếm ngược cho biết còn bao lâu.",
        },
        {
          kind: "bullets",
          items: [
            "Đặt mốc mới cùng phạm vi với lệnh đang chạy thì mốc cũ bị thay, không cộng dồn. Khác phạm vi (một lệnh cho tất cả camera, một lệnh cho riêng một camera) thì hai lệnh chạy song song.",
            "Bấm Bật lại ngay là nhận lại ngay, không phải chờ hết giờ.",
            "Chỉ có bốn mốc 15 phút, 30 phút, 1 giờ và 4 giờ — cố ý không cho nhập số phút tự do để không ai lỡ tắt quá lâu rồi quên.",
          ],
        },
      ],
    },
    {
      id: "faq-tat-rieng-mot-camera",
      heading: "Chỉ muốn tắt thông báo của một camera, được không?",
      blocks: [
        {
          kind: "paragraph",
          text: "Được. Vào tab Cài đặt, chọn Thông báo camera, bấm ô Áp dụng cho rồi chọn camera cần tắt — tìm theo mã, tên hoặc tên khu vực, gõ không dấu cũng ra. Sau đó bấm mốc thời gian như bình thường.",
        },
        {
          kind: "bullets",
          items: [
            "Các camera còn lại vẫn báo bình thường.",
            "Muốn quay về tắt toàn bộ thì mở lại ô đó và chọn Tất cả camera.",
            "Ô Áp dụng cho dùng chung cho cả khối TẮT CHO CẢ CÔNG TY: đang chọn một camera thì nút đỏ chỉ tắt camera đó, nhưng tắt cho mọi người.",
          ],
        },
      ],
    },
    {
      id: "faq-bam-thong-bao-camera",
      heading: "Bấm vào thông báo camera thì mở ra gì?",
      blocks: [
        {
          kind: "paragraph",
          text: "App mở thẳng hình trực tiếp của đúng camera vừa báo. Nếu app đang khoá bằng Face ID thì mở sau khi xác thực xong. Thông báo không kèm ảnh hiện trường, nên muốn biết chuyện gì thì phải mở xem trực tiếp.",
        },
        {
          kind: "paragraph",
          text: "Camera chỉ xem được khi máy đang ở mạng nội bộ công ty. Đang dùng 4G thì thông báo vẫn tới nhưng hình không lên — không phải camera hỏng.",
        },
      ],
    },
    {
      id: "faq-khong-thay-workflow",
      heading: "Không thấy Workflow hoặc tab Lịch",
      blocks: [
        {
          kind: "paragraph",
          text: "Ô Workflow ở tab Chức năng và tab Lịch ở thanh dưới chỉ hiện với tài khoản được cấp quyền xem Workflow. Liên hệ IT để được cấp.",
        },
        {
          kind: "bullets",
          items: [
            "Vào Workflow mà báo \"Bạn không có quyền truy cập\": chưa có quyền xem Workflow.",
            "Vào được nhưng báo \"Chưa có chức năng\": có quyền vào Workflow nhưng chưa được cấp quyền xem phiếu đề nghị, công việc hay kế hoạch.",
            "Thấy Công việc mà không thấy Kế hoạch (hoặc ngược lại): mỗi chức năng cấp quyền riêng.",
          ],
        },
        {
          kind: "paragraph",
          text: "IT vừa cấp quyền mà app chưa đổi thì đăng xuất rồi đăng nhập lại.",
        },
      ],
    },
    {
      id: "faq-tab-camera-thanh-lich",
      heading: "Tab Camera biến thành Lịch, giờ xem camera ở đâu?",
      blocks: [
        {
          kind: "paragraph",
          text: "Tài khoản dùng Workflow có tab Lịch ở đúng chỗ tab Camera cũ. Camera vẫn còn: vào tab Chức năng, chọn ô Camera. Hay xem thì ghim ô Camera lên khối TRUY CẬP NHANH ở Trang chủ.",
        },
        {
          kind: "paragraph",
          text: "Lúc mới mở app thấy tab Camera rồi tự đổi thành Lịch là bình thường — app vừa tải xong quyền của tài khoản.",
        },
      ],
    },
    {
      id: "faq-chuong-sap-trien-khai",
      heading: 'Bấm chuông thì báo "Chức năng sẽ được triển khai trong thời gian sắp tới."',
      blocks: [
        {
          kind: "paragraph",
          text: "Màn Thông báo đang được hoàn thiện, nên hiện mọi tài khoản bấm chuông đều thấy câu này. Phiếu chờ duyệt, việc được giao, sắp hạn, quá hạn và bình luận của Workflow xem bằng nút Việc cần xử lý (hình khay giấy) ngay cạnh chuông.",
        },
        {
          kind: "paragraph",
          text: "Thông báo camera không nằm ở chuông: chúng hiện thẳng trên điện thoại như thông báo bình thường.",
        },
      ],
    },
    {
      id: "faq-khong-thay-tong-quan-cong-viec",
      heading: "Không thấy khối Tổng quan công việc ở Trang chủ",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Khối chỉ hiện với tài khoản được cấp quyền Workflow. Chưa có quyền thì nhờ IT cấp.",
            "Khối có thể đang nằm ở chỗ khác: bấm nút sắp xếp trên thanh đầu Trang chủ để xem và kéo khối lên.",
            "Khối báo không tải được thì kiểm tra mạng nội bộ rồi bấm Thử lại, hoặc kéo Trang chủ xuống để tải lại.",
          ],
        },
      ],
    },
    {
      id: "faq-chua-lien-ket-nhan-vien",
      heading: 'Lập phiếu thì báo "Chưa liên kết nhân viên"',
      blocks: [
        {
          kind: "paragraph",
          text: "Phiếu và công việc gắn với người lập, người duyệt, người chủ trì theo hồ sơ nhân viên. Tài khoản chưa được gắn với một hồ sơ nhân viên trên hệ thống thì chỉ xem được, không lập phiếu, không duyệt, không thêm việc được — các nút đó ẩn hẳn.",
        },
        {
          kind: "paragraph",
          text: "Liên hệ IT, nói rõ tên tài khoản để được gắn vào đúng hồ sơ nhân viên, rồi đăng xuất và đăng nhập lại.",
        },
      ],
    },
    {
      id: "faq-phieu-khong-co-nut-duyet",
      heading: "Phiếu không có nút Duyệt",
      blocks: [
        {
          kind: "paragraph",
          text: "Nút Duyệt / Từ chối chỉ hiện khi phiếu đang tới lượt bạn — dòng Bước hiện tại ở màn Chi tiết phiếu và tên bước trên thẻ ở danh sách hiện chữ đỏ.",
        },
        {
          kind: "bullets",
          items: [
            "Phiếu đang chờ bước của người khác: bấm Quy trình để xem đang chờ ai.",
            "Bạn đã duyệt bước của mình rồi: phiếu không còn ở tab Chờ duyệt — tìm ở tab Tất cả.",
            "Tài khoản chưa liên kết nhân viên: nút duyệt ẩn hẳn — xem câu \"Chưa liên kết nhân viên\".",
            "Thấy Duyệt mà không thấy Không ý kiến: bước này không cho chọn Không ý kiến.",
          ],
        },
      ],
    },
    {
      id: "faq-tu-choi-nham",
      heading: "Lỡ bấm Từ chối một phiếu",
      blocks: [
        {
          kind: "paragraph",
          text: "Từ chối là đóng phiếu, không mở lại được — vì vậy app hỏi \"Từ chối sẽ đóng phiếu, không quay lại được. Tiếp tục?\" trước khi gửi.",
        },
        {
          kind: "paragraph",
          text: "Đã lỡ thì báo người lập phiếu. Họ mở phiếu cũ, bấm Nhân bản để có phiếu mới cùng nội dung rồi nộp lại, không phải nhập từ đầu.",
        },
      ],
    },
    {
      id: "faq-duyet-tat-ca-con-phieu",
      heading: "Bấm Duyệt nhiều mà vẫn còn phiếu chờ",
      blocks: [
        {
          kind: "bullets",
          items: [
            "Mỗi lượt duyệt tối đa 500 phiếu. Nhiều hơn thì app báo và duyệt phần đầu — bấm Duyệt nhiều (nút ngay dưới các tab, bản trước ghi Duyệt tất cả) thêm lần nữa cho phần còn lại.",
            "Phiếu cần chọn người duyệt cho bước tiếp theo không duyệt hàng loạt được. Mở từng phiếu, chọn người rồi bấm Duyệt.",
            "Phiếu ở lượt cuối có Tạo công việc mà bạn chọn Bỏ qua các phiếu này thì phải mở từng phiếu, chọn Tạo công việc.",
          ],
        },
        {
          kind: "paragraph",
          text: "Bảng Kết quả duyệt sau mỗi lượt ghi rõ bao nhiêu phiếu đã duyệt và vì sao những phiếu còn lại chưa duyệt.",
        },
      ],
    },
    {
      id: "faq-khong-thay-nut-cong-viec",
      heading: "Không thấy nút Sửa / Gia hạn / Đổi chủ trì / Xoá ở công việc",
      blocks: [
        {
          kind: "paragraph",
          text: "Nút nào hiện là do hệ thống tính theo vai trò của bạn trong từng việc, không phải do app lỗi.",
        },
        {
          kind: "bullets",
          items: [
            "Sửa, Gia hạn, Đổi chủ trì: chỉ khi việc chưa xong. Việc đã Hoàn thành hoặc Hủy thì các nút này ẩn.",
            "Xoá: chỉ người tạo, khi việc còn Mới và không sinh từ phiếu đề nghị. Việc sinh từ phiếu muốn bỏ thì Chuyển trạng thái → Hủy.",
            "Bạn là chủ trì mà không có Đổi chủ trì: người tạo việc đã bật Không được chuyển người chủ trì.",
            "Có dòng \"Bạn đang xem ở chế độ chỉ xem.\": bạn chỉ được xem việc này (ví dụ chủ trì kế hoạch chứa việc), không thao tác được.",
          ],
        },
      ],
    },
    {
      id: "faq-khong-xoa-duoc-ke-hoach",
      heading: "Nút Xoá kế hoạch bị mờ",
      blocks: [
        {
          kind: "paragraph",
          text: "Kế hoạch còn công việc thì không xoá được — xoá là mất mối gom các việc đó. Chỉ kế hoạch không còn việc nào mới xoá được, và chỉ chủ trì kế hoạch thấy nút Xoá.",
        },
      ],
    },
    {
      id: "faq-file-qua-lon",
      heading: "Đính kèm file thì báo \"File quá lớn\"",
      blocks: [
        {
          kind: "paragraph",
          text: "Mỗi file đính kèm ở phiếu, công việc và bình luận tối đa 20MB; file lớn hơn bị bỏ qua, các file còn lại vẫn được thêm.",
        },
        {
          kind: "bullets",
          items: [
            "Ảnh chụp: chọn Chụp ảnh hoặc Ảnh trong máy — app tự nén nhỏ hơn ảnh gốc.",
            "Tài liệu: xuất PDF thay vì gửi file gốc nặng, hoặc tách thành nhiều file.",
            "Lưu phiếu mà có file chưa tải lên được: app báo Đã lưu nháp — phiếu vẫn là nháp, CHƯA nộp. Mở lại nháp ở tab Nháp, bấm Sửa, thêm lại file rồi Lưu phiếu.",
            "Lưu công việc mà có file chưa tải lên được: việc đã lưu rồi, mở File (n) ở màn chi tiết để thêm lại file đó.",
          ],
        },
      ],
    },
    {
      id: "faq-khong-co-thong-bao-day-workflow",
      heading: "Có phiếu chờ duyệt mà điện thoại không báo",
      blocks: [
        {
          kind: "paragraph",
          text: "Hiện hệ thống chưa gửi thông báo đẩy cho phiếu đề nghị và công việc — phần này sẽ được bổ sung sau. Trong lúc chờ, mở nút Việc cần xử lý cạnh chuông ở Trang chủ hoặc tab Chờ duyệt của Ticket phòng ban để xem việc mới.",
        },
        {
          kind: "paragraph",
          text: "Số đỏ trên ô Workflow ở Trang chủ / tab Chức năng cho biết bạn đang có bao nhiêu việc cần xử lý; bấm nút Việc cần xử lý cạnh chuông để xem các việc đó, còn số n chờ duyệt ở màn Workflow cho biết còn bao nhiêu phiếu đang đợi bạn.",
        },
      ],
    },
    {
      id: "faq-khong-thay-viec-dong-nghiep",
      heading: "Không thấy công việc của đồng nghiệp",
      blocks: [
        {
          kind: "paragraph",
          text: "Danh sách Công việc và tab Lịch chỉ có việc của bạn: việc bạn tạo, hoặc có tên trong người tham gia (Chủ trì, Phối hợp, Để biết).",
        },
        {
          kind: "bullets",
          items: [
            "Cần theo dõi một việc thì nhờ người tạo thêm bạn vào mục Để biết.",
            "Chủ trì kế hoạch xem được mọi việc trong kế hoạch của mình ở tab Công việc của kế hoạch.",
          ],
        },
      ],
    },
    {
      id: "faq-khong-thay-dinh-ky",
      heading: "Không thấy mục Định kỳ khi tạo việc",
      blocks: [
        {
          kind: "paragraph",
          text: "Mục Định kỳ chỉ có ở màn Thêm công việc. Sửa một việc đã có, hoặc tạo việc từ phiếu đề nghị (màn Tạo công việc), thì không có mục này.",
        },
        {
          kind: "paragraph",
          text: "Mỗi lần lặp sinh ra là một việc riêng, thẻ ghi Định kỳ · lần n. Sửa, gia hạn hay chuyển trạng thái từng lần như việc thường.",
        },
      ],
    },
    {
      id: "faq-danh-thiep-khong-co-ma-qr",
      heading: "Màn Thông tin QrCode không có mã QR",
      blocks: [
        {
          kind: "paragraph",
          text: "Mã QR là đường link tới trang danh thiếp của bạn, nên chỉ hiện khi tài khoản đã được gán hồ sơ nhân viên và hồ sơ đó đã có trang danh thiếp trên hệ thống. Thiếu một trong hai thì màn chỉ còn họ tên, chỗ mã QR để trống.",
        },
        {
          kind: "paragraph",
          text: "Liên hệ IT, nói rõ tên tài khoản để được gán vào đúng hồ sơ nhân viên và tạo trang danh thiếp. Xong thì đăng xuất và đăng nhập lại là mã hiện ra.",
        },
      ],
    },
    {
      id: "faq-quet-danh-thiep",
      heading: "Người khác quét danh thiếp của tôi thì ra gì?",
      blocks: [
        {
          kind: "paragraph",
          text: "Máy của họ mở trang danh thiếp của bạn trên web — không còn hiện ngay thẻ liên hệ như bản cũ. Trên trang có nút tải thẻ liên hệ (vCard) để lưu vào danh bạ, và nút đổi tiếng Việt / tiếng Anh.",
        },
        {
          kind: "bullets",
          items: [
            "Phải quét bằng camera có sẵn của điện thoại (hoặc Zalo, ứng dụng quét QR bất kỳ). Nút Quét QR trong app này chỉ đọc tem tài sản nên sẽ báo Mã QR không hợp lệ.",
            "Quét ra link mà không mở được trang: máy người quét cần có mạng; thử mở lại link bằng trình duyệt.",
            "Tăng độ sáng màn hình và giữ máy yên cho mã nằm gọn trong khung.",
          ],
        },
      ],
    },
    {
      id: "faq-ho-so-chua-cap-nhat",
      heading: "Hồ sơ cá nhân / danh thiếp hiện thông tin cũ hoặc sai",
      blocks: [
        {
          kind: "paragraph",
          text: "Thông tin lấy từ hồ sơ nhân viên trên hệ thống, app không sửa được. Sai chỗ nào thì báo IT hoặc bộ phận nhân sự cập nhật trên web.",
        },
        {
          kind: "paragraph",
          text: "App tải hồ sơ một lần lúc đăng nhập rồi dùng lại cho cả Hồ sơ cá nhân lẫn Thông tin QrCode. Đã sửa trên hệ thống mà app chưa đổi thì đăng xuất rồi đăng nhập lại.",
        },
        {
          kind: "note",
          tone: "info",
          text: "Hồ sơ cá nhân giờ gồm Mã nhân viên, Điện thoại, Tổ đội, Chức vụ cơ cấu; không còn dòng Đơn vị. Dòng nào hiện trống là hồ sơ nhân viên chưa khai mục đó.",
        },
      ],
    },
    {
      id: "faq-khong-tim-thay-tai-khoan",
      heading: 'App báo "Không tìm thấy tài khoản" và chỉ có nút Đăng xuất',
      blocks: [
        {
          kind: "paragraph",
          text: "Tài khoản đã bị xoá hoặc khoá trên hệ thống trong lúc bạn vẫn đang đăng nhập. Bấm Đăng xuất, rồi liên hệ IT nếu bạn vẫn cần dùng tài khoản đó.",
        },
      ],
    },
    {
      id: "faq-o-so-lieu-mot-nhanh",
      heading: "Bấm ô Thiết bị ở Trang chủ chỉ thấy một phần danh sách tài sản",
      blocks: [
        {
          kind: "paragraph",
          text: "Đúng như thiết kế. Ô Thiết bị máy móc đang quản lý chỉ mở nhánh máy móc trong nhóm Tài sản, ô Thiết bị CNTT đang sử dụng chỉ mở nhánh CNTT trong nhóm IT — tiêu đề thanh đỏ ghi đúng tên nhóm đang xem.",
        },
        {
          kind: "bullets",
          items: [
            "Muốn xem cả cây: vào tab Chức năng rồi chọn Tài sản (máy móc) hoặc IT (thiết bị CNTT). CNTT đã chuyển từ nhóm Tài sản sang nhóm IT nên không còn nằm trong Tài sản.",
            "Mở ra danh sách trống: nhánh đó chưa có dữ liệu hoặc tài khoản không có quyền xem các mục trong nhánh — liên hệ IT.",
          ],
        },
      ],
    },
    {
      id: "faq-ban-do-trang",
      heading: "Bản đồ phương tiện trắng trơn trên iPhone",
      blocks: [
        {
          kind: "paragraph",
          text: "Bản cũ trên iPhone tải nền bản đồ từ một nguồn bị một số nhà mạng chặn, nên có chỗ chỉ thấy nền trắng và vài chấm. Từ bản 2.40, iPhone dùng bản đồ Apple nên không còn gặp.",
        },
        {
          kind: "bullets",
          items: [
            "Cập nhật app lên bản mới nhất — xem câu Làm sao biết app đã là bản mới nhất? ngay dưới.",
            "Đã là bản mới mà vẫn trắng: kiểm tra mạng, rồi thoát màn bản đồ vào lại.",
          ],
        },
      ],
    },
    {
      id: "faq-co-chu",
      heading: "Chữ trong app quá nhỏ hoặc quá to",
      blocks: [
        {
          kind: "steps",
          items: [
            "Vào tab Cài đặt, chọn Cỡ chữ.",
            "Kéo thanh trượt về phía chữ A lớn để chữ to hơn, về phía chữ A nhỏ để chữ nhỏ lại. Đoạn chữ phía trên đổi ngay để xem trước.",
            "Nhấc tay khỏi thanh trượt là cả app đổi theo ngay, không cần mở lại app.",
          ],
        },
        {
          kind: "note",
          tone: "info",
          text: "Cỡ chữ của app nhân thêm vào cỡ chữ đã đặt trong điện thoại. Đã kéo về 100% mà chữ vẫn to (hoặc nhỏ) bất thường thì xem lại cỡ chữ trong Cài đặt của điện thoại.",
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
