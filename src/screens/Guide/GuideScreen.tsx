import React, { useMemo, useState } from "react";
import { Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import DeviceInfo from "react-native-device-info";
import Ionicons from "react-native-vector-icons/Ionicons";

import EmptyState from "../../components/ui/EmptyState";
import SearchBar from "../../components/ui/SearchBar";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_LINK,
} from "../../constants/support";
import type { GuideNavigationProp } from "../../types";
import { formatVersionWithBuild } from "../../utils/AppVersion";
import { C, useStyles } from "../../utils/helpers/colors";
import { makeGuideStyles } from "./GuideScreen.styles";
import { filterGuideTopics } from "./shared/guideSearch";
import GuideTopicRow from "./shared/GuideTopicRow";
import { GUIDE_GROUP_ORDER, type GuideGroup } from "./shared/guideTypes";

/**
 * Mục lục tài liệu hướng dẫn sử dụng, mở từ tab Cài đặt.
 *
 * Chủ đề gom theo nhóm thay vì một danh sách phẳng: mười ba chủ đề liệt kê liền
 * nhau thì người dùng phải đọc hết mới biết cái mình cần nằm đâu. Ô tìm kiếm quét
 * cả nội dung bên trong chủ đề, nên gõ đúng chữ nhìn thấy trên màn hình (tên nút,
 * câu thông báo lỗi) là ra chủ đề nói về nó.
 */
export default function GuideScreen() {
  const styles = useStyles(makeGuideStyles);
  const navigation = useNavigation<GuideNavigationProp>();
  const [query, setQuery] = useState("");

  const hits = useMemo(() => filterGuideTopics(query), [query]);
  const isSearching = query.trim().length > 0;

  const groups = useMemo(() => {
    return GUIDE_GROUP_ORDER.map((group: GuideGroup) => ({
      group,
      hits: hits.filter((hit) => hit.topic.group === group),
    })).filter((entry) => entry.hits.length > 0);
  }, [hits]);

  const appVersionLabel = `v${formatVersionWithBuild(
    DeviceInfo.getVersion(),
    DeviceInfo.getBuildNumber(),
  )}`;

  const openSupportEmail = () =>
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        "Hỗ trợ sử dụng ứng dụng",
      )}`,
    );

  return (
    <View style={styles.root}>
      {/* Ô tìm kiếm đứng ngoài ScrollView: cuộn xuống giữa mục lục vẫn gõ lọc
          được ngay, không phải kéo lên đầu. */}
      <View style={styles.searchWrap}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm trong hướng dẫn"
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {isSearching ? null : (
          <Text style={styles.intro}>
            Chọn một chủ đề để xem từng bước. Gõ vào ô tìm kiếm để tìm theo chữ
            trên màn hình hoặc theo câu thông báo lỗi bạn gặp — không cần gõ dấu.
            {"\n\n"}
            Tài liệu mô tả đầy đủ chức năng của ứng dụng. Những gì bạn thấy được
            trên máy còn tuỳ quyền của tài khoản, nên có thể ít hơn tài liệu này —
            thiếu chức năng cần dùng thì liên hệ IT để được cấp quyền.
          </Text>
        )}

        {groups.map(({ group, hits: groupHits }) => (
          <View key={group} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderTitle}>{group}</Text>
            </View>
            {groupHits.map((hit, index) => (
              <GuideTopicRow
                key={hit.topic.id}
                topic={hit.topic}
                matchedHeadings={hit.matchedHeadings}
                isLast={index === groupHits.length - 1}
                onPress={() =>
                  navigation.navigate("GuideTopic", {
                    topicId: hit.topic.id,
                    titleHeader: hit.topic.title,
                  })
                }
              />
            ))}
          </View>
        ))}

        {groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <EmptyState
              iconName="search-outline"
              title="Không tìm thấy nội dung"
              subtitle={`Không có chủ đề nào khớp với "${query.trim()}". Thử một từ khoá ngắn hơn, ví dụ "tu lanh" hoặc "quyen".`}
              fullHeight={false}
            />
          </View>
        ) : null}

        {isSearching ? null : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardHeaderTitle}>Liên hệ hỗ trợ</Text>
              </View>
              <TouchableOpacity
                style={styles.contactRow}
                onPress={openSupportEmail}
                activeOpacity={0.65}
                accessibilityRole="button"
              >
                <View style={[styles.contactIcon, { backgroundColor: C.blue }]}>
                  <Ionicons name="mail-outline" size={17} color={C.onBrand} />
                </View>
                <View style={styles.contactTextCol}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={C.blue} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactRow, styles.contactRowLast]}
                onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE_LINK}`)}
                activeOpacity={0.65}
                accessibilityRole="button"
              >
                <View
                  style={[styles.contactIcon, { backgroundColor: C.emerald }]}
                >
                  <Ionicons name="call-outline" size={17} color={C.onBrand} />
                </View>
                <View style={styles.contactTextCol}>
                  <Text style={styles.contactLabel}>Điện thoại</Text>
                  <Text style={styles.contactValue}>{SUPPORT_PHONE}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={C.emerald} />
              </TouchableOpacity>
            </View>

            <Text style={styles.footerNote}>
              Tài liệu áp dụng cho phiên bản {appVersionLabel}. Ảnh minh hoạ chụp
              ở giao diện Sáng.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}
