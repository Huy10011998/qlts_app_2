import React from "react";
import { Text, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import EmptyState from "../../components/ui/EmptyState";
import type { GuideTopicRouteProp } from "../../types";
import { C, useStyles } from "../../utils/helpers/colors";
import ScreenContainer from "../shared/ScreenContainer";
import { guideCardAccent, makeGuideStyles } from "./GuideScreen.styles";
import { getGuideTopic } from "./shared/guideContent";
import GuideTopicSectionList from "./shared/GuideTopicSectionList";

/** Nội dung một chủ đề hướng dẫn. */
export default function GuideTopicScreen() {
  const styles = useStyles(makeGuideStyles);
  const { params } = useRoute<GuideTopicRouteProp>();
  const topic = getGuideTopic(params.topicId);

  if (!topic) {
    return (
      <ScreenContainer>
        <EmptyState
          iconName="document-text-outline"
          title="Chưa có nội dung cho chủ đề này"
          subtitle="Nội dung hướng dẫn sẽ được bổ sung ở bản cập nhật sau."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <GuideTopicSectionList
        topic={topic}
        hero={
          // Thẻ của chủ đề viền theo màu icon chủ đề đó.
          <View style={[styles.card, guideCardAccent(topic.iconBg)]}>
            <View style={styles.topicHero}>
              <View style={[styles.topicIcon, { backgroundColor: topic.iconBg }]}>
                {topic.lib === "material-community" ? (
                  <MaterialCommunityIcons
                    name={topic.iconName}
                    size={18}
                    color={C.onBrand}
                  />
                ) : (
                  <Ionicons name={topic.iconName} size={18} color={C.onBrand} />
                )}
              </View>
              <View style={styles.topicHeroText}>
                <Text style={styles.topicHeroTitle}>{topic.title}</Text>
                <Text style={styles.topicHeroSummary}>{topic.summary}</Text>
              </View>
            </View>
          </View>
        }
      />
    </ScreenContainer>
  );
}
