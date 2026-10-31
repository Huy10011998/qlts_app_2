import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import EmptyState from "../../../components/ui/EmptyState";
import SearchBar from "../../../components/ui/SearchBar";
import HeaderSearchReveal from "../../../components/ui/HeaderSearchReveal";
import { useHeaderSearch } from "../../../hooks/useHeaderSearch";
import { useStyles } from "../../../utils/helpers/colors";
import {
  guideCardAccent,
  guideCardHeaderAccent,
  makeGuideStyles,
} from "../GuideScreen.styles";
import GuideSectionCard from "./GuideSectionCard";
import { filterGuideSections } from "./guideSearch";
import type { GuideTopic } from "./guideTypes";

/**
 * Các mục của một chủ đề, kèm thẻ đầu chủ đề (`hero`).
 *
 * Chủ đề dạng hỏi đáp (`collapsibleSections` — Câu hỏi thường gặp) có thêm ô
 * tìm kiếm: hơn năm mươi câu hỏi gập lại vẫn phải cuộn mấy màn mới hết. Ô tìm
 * quét cả câu trả lời, gõ không dấu cũng ra — như ô tìm ở mục lục Hướng dẫn.
 * Câu hỏi gom theo nhóm (`sectionGroups`), mỗi nhóm một thẻ có tiêu đề.
 */
export default function GuideTopicSectionList({
  topic,
  hero,
}: {
  topic: GuideTopic;
  hero: React.ReactNode;
}) {
  const styles = useStyles(makeGuideStyles);
  const [query, setQuery] = useState("");
  const isSearchable = Boolean(topic.collapsibleSections);
  const search = useHeaderSearch({
    query,
    onClear: () => setQuery(""),
    enabled: isSearchable,
  });
  const isSearching = isSearchable && query.trim().length > 0;

  /* Chủ đề có `sectionGroups` thì gom mục theo nhóm (bỏ nhóm không còn mục
     nào khớp từ khoá); không có thì một danh sách phẳng, mỗi mục một thẻ. */
  const { sections, groups } = useMemo(() => {
    const matched = isSearching
      ? filterGuideSections(topic.id, query)
      : topic.sections;
    return {
      sections: matched,
      groups: topic.sectionGroups
        ?.map((title) => ({
          title,
          sections: matched.filter((section) => section.group === title),
        }))
        .filter((group) => group.sections.length > 0),
    };
  }, [isSearching, query, topic]);

  return (
    <>
      {/* Ô tìm kiếm ẩn sau nút kính lúp trên header như mục lục Hướng dẫn;
          mở thì đứng ngoài ScrollView, cuộn giữa danh sách vẫn gõ lọc được. */}
      <HeaderSearchReveal open={search.open}>
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm câu hỏi"
            autoFocus
            onClose={search.close}
          />
        </View>
      </HeaderSearchReveal>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isSearching ? (
          sections.length ? (
            <Text style={styles.intro}>{`Tìm thấy ${sections.length} câu hỏi`}</Text>
          ) : null
        ) : (
          <>
            {/* Lời dẫn cùng kiểu mục lục Hướng dẫn: nói cách dùng màn này. */}
            {isSearchable ? (
              <Text style={styles.intro}>
                Bấm vào một câu hỏi để xem câu trả lời. Gõ vào ô tìm kiếm để tìm
                theo chữ trên màn hình hoặc theo câu thông báo lỗi bạn gặp —
                không cần gõ dấu.
                {"\n\n"}
                Không thấy câu hỏi của mình thì xem thêm Hướng dẫn sử dụng, hoặc
                liên hệ IT qua mục Liên hệ hỗ trợ ở cuối màn Hướng dẫn sử dụng.
              </Text>
            ) : null}
            {hero}
          </>
        )}

        {groups
          ? groups.map((group) => (
              <View
                key={group.title}
                style={[styles.card, guideCardAccent(topic.iconBg)]}
              >
                <View
                  style={[
                    styles.cardHeader,
                    guideCardHeaderAccent(topic.iconBg),
                  ]}
                >
                  <Text style={styles.cardHeaderTitle}>{group.title}</Text>
                </View>
                {group.sections.map((section, index) => (
                  <GuideSectionCard
                    key={section.id}
                    section={section}
                    collapsible={topic.collapsibleSections}
                    accent={topic.iconBg}
                    asRow
                    isLast={index === group.sections.length - 1}
                  />
                ))}
              </View>
            ))
          : sections.map((section) => (
              <GuideSectionCard
                key={section.id}
                section={section}
                collapsible={topic.collapsibleSections}
                accent={topic.iconBg}
              />
            ))}

        {isSearching && !sections.length ? (
          <View style={[styles.emptyCard, guideCardAccent(topic.iconBg)]}>
            <EmptyState
              iconName="search-outline"
              title="Không tìm thấy câu hỏi"
              subtitle={`Không có câu hỏi nào khớp với "${query.trim()}". Thử một từ khoá ngắn hơn, hoặc tìm trong Hướng dẫn sử dụng.`}
              fullHeight={false}
            />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
