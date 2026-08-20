import { removeVietnameseTones } from "../../../utils/helpers/string";
import { GUIDE_TOPICS } from "./guideContent";
import type { GuideBlock, GuideSection, GuideTopic } from "./guideTypes";

/**
 * Tìm kiếm trong tài liệu: gõ không dấu vẫn ra kết quả, vì mọi chữ trong tài liệu
 * đều là tiếng Việt có dấu còn người dùng thường gõ chay ("tu lanh", "quet qr").
 *
 * Index dựng một lần ở mức module — nội dung là hằng số nên không có lý do dựng
 * lại mỗi lần gõ một chữ.
 */

const blockText = (block: GuideBlock): string => {
  switch (block.kind) {
    case "paragraph":
    case "note":
      return block.text;
    case "steps":
    case "bullets":
      return block.items.join(" ");
    case "image":
      return block.caption ?? "";
  }
};

const sectionText = (section: GuideSection): string =>
  [section.heading, ...section.blocks.map(blockText)].join(" ");

type IndexedTopic = {
  topic: GuideTopic;
  /** Toàn bộ chữ của chủ đề, đã bỏ dấu. */
  haystack: string;
  /** Từng section kèm chữ đã bỏ dấu, để biết section nào khớp. */
  sections: { heading: string; haystack: string }[];
};

const INDEX: IndexedTopic[] = GUIDE_TOPICS.map((topic) => ({
  topic,
  haystack: removeVietnameseTones(
    [
      topic.title,
      topic.summary,
      ...(topic.keywords ?? []),
      ...topic.sections.map(sectionText),
    ].join(" "),
  ),
  sections: topic.sections.map((section) => ({
    heading: section.heading,
    haystack: removeVietnameseTones(sectionText(section)),
  })),
}));

export type GuideSearchHit = {
  topic: GuideTopic;
  /** Tên các mục khớp từ khoá, hiện dưới chủ đề để giải thích vì sao nó khớp. */
  matchedHeadings: string[];
};

/** Chuỗi rỗng trả về tất cả chủ đề, không có mục khớp nào. */
export const filterGuideTopics = (query: string): GuideSearchHit[] => {
  const keyword = removeVietnameseTones(query.trim());

  if (!keyword) {
    return INDEX.map(({ topic }) => ({ topic, matchedHeadings: [] }));
  }

  return INDEX.filter((entry) => entry.haystack.includes(keyword)).map(
    (entry) => ({
      topic: entry.topic,
      matchedHeadings: entry.sections
        .filter((section) => section.haystack.includes(keyword))
        .map((section) => section.heading),
    }),
  );
};
