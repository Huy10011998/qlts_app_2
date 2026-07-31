/**
 * Bộ nhớ tạm dạng FIFO có giới hạn để chống xử lý trùng một thông báo.
 *
 * Cần thiết vì cùng một message có thể chạm vào app qua nhiều đường:
 * - hiển thị: onMessage (foreground) và setBackgroundMessageHandler có thể cùng
 *   fire khi app chuyển trạng thái đúng lúc message tới;
 * - bấm vào thông báo: getInitialNotification (FCM) và
 *   notifee.getInitialNotification cùng trả về ở lần mở app đầu tiên.
 *
 * Phạm vi là từng JS runtime — app bị kill sẽ mất cache, và đó là hành vi đúng.
 */
export const createDedupeStore = (limit: number) => {
  const seen = new Set<string>();
  const order: string[] = [];

  return {
    /** true nếu id chưa từng thấy (và ghi nhận lại); false nếu đã xử lý rồi. */
    claim(id: string): boolean {
      if (seen.has(id)) return false;

      seen.add(id);
      order.push(id);

      while (order.length > limit) {
        const evicted = order.shift();
        if (evicted !== undefined) seen.delete(evicted);
      }

      return true;
    },

    /** Nhả lại một id đã claim — dùng khi bước xử lý sau đó thất bại. */
    release(id: string): void {
      if (!seen.delete(id)) return;

      const index = order.indexOf(id);
      if (index !== -1) order.splice(index, 1);
    },

    has(id: string): boolean {
      return seen.has(id);
    },

    reset(): void {
      seen.clear();
      order.length = 0;
    },
  };
};

export type DedupeStore = ReturnType<typeof createDedupeStore>;
