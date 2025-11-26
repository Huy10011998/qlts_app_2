import React, {
  ComponentType,
  Dispatch,
  PropsWithChildren,
  ReactElement,
  SetStateAction,
} from "react";
import { Field, Item } from "./Model.d";
import {
  StyleProp,
  TextInputProps,
  TextProps,
  ViewProps,
  ViewStyle,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { TAB_ITEMS } from "../utils/Helper";
import { TabItem } from "./Context.d";

export interface CardItemProps {
  item: Record<string, any>;
  fields?: Field[];
  icon?: string;
  onPress?: (item: Record<string, any>) => void;
}

export interface SearchInputProps {
  visible: boolean;
  value: string;
  onChange: (text: string) => void;
}

export interface SettingHeaderProps {
  name: string;
  avatarUrl?: string;
}

export interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

export type DropdownProps = {
  item: Item;
  level?: number;
  expandedIds: (string | number)[];
  onToggle: (id: string | number) => void;
};

export interface MenuItemCardProps extends MenuItemComponent {
  index: number;
}

export type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export type ScreenOption = {
  component: ComponentType<any>; //
  name: string;
  title?: string;
  icon: keyof typeof Ionicons;
  showHeader?: boolean;
};

export type TabCustomProps = {
  screens?: TabScreen[];
  showHeader?: boolean;
  backgroundColor?: string;
  customHeader?: React.ComponentType<any>;
};

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
};

export type ThemedTextInputProps = TextInputProps & {
  lightColor?: string;
  darkColor?: string;
};

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export interface TabContentProps {
  activeTab: string;
  groupedFields: Record<string, Field[]>;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (groupName: string) => void;
  getFieldValue: (item: Record<string, any>, field: Field) => string;
  item: any;
  previousItem?: any;
  nameClass?: string;
  fieldActive: Field[];
  isFieldChanged?: (
    field: Field,
    currentItem: any,
    previousItem: any
  ) => boolean;
}

export interface CenterTextProps {
  text: string;
}

export interface GroupListProps {
  groupedFields: Record<string, Field[]>;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (groupName: string) => void;
  getFieldValue: (item: Record<string, any>, field: Field) => string;
  item: any;
  previousItem?: any;
  nameClass?: string;
  fieldActive?: Field[];
  isFieldChanged?: (
    field: Field,
    currentItem: any,
    previousItem: any
  ) => boolean;
}

export interface AssetDeleteProps {
  onEdit: () => void;
  onDelete: () => void;
}

export interface BottomBarProps {
  tabs: readonly TabItem[];
  activeTab: string;
  onTabPress: (tabKey: string, label: string) => void;
}

export interface HeaderContextProps {
  title: string;
  setTitle: (t: string) => void;
}

export interface DetailsProps {
  children: (props: {
    activeTab: string;
    setActiveTab: (tabKey: string, label: string) => void;
    groupedFields: Record<string, Field[]>;
    collapsedGroups: Record<string, boolean>;
    toggleGroup: (groupName: string) => void;
    item: any;
    getFieldValue: any;
    fieldActive: Field[];
    nameClass: string;
    TAB_ITEMS?: typeof TAB_ITEMS;
  }) => React.ReactNode;
}

export interface QrDetailsProps {
  children: (props: {
    activeTab: string;
    setActiveTab: (tabKey: string, label: string) => void;
    groupedFields: Record<string, Field[]>;
    collapsedGroups: Record<string, boolean>;
    toggleGroup: (groupName: string) => void;
    item: any;
    getFieldValue: any;
  }) => React.ReactNode;
}

export interface DetailsHistoryProps {
  children: (props: {
    activeTab: string;
    setActiveTab: (tabKey: string, label: string) => void;
    groupedFields: Record<string, Field[]>;
    collapsedGroups: Record<string, boolean>;
    toggleGroup: (groupName: string) => void;
    item: any;
    getFieldValue: any;
    TAB_ITEMS?: typeof TAB_ITEMS;
    previousItem: any;
    isFieldChanged: (
      field: Field,
      currentItem: any,
      previousItem: any
    ) => boolean;
  }) => React.ReactNode;
}

export interface ListContainerProps {
  name?: string;
  path?: string;
}

export interface MenuItemComponent {
  id: string;
  label: string;
  iconName: string;
  notificationCount?: number;
  onPress?: () => void;
}

export type ListCardAttachFileProps = CardItemProps & {
  onView?: (item: any) => void;
};

export type TabScreen = {
  name: string;
  title?: string;
  icon: string;
  component: ComponentType<any>;
  showHeader?: boolean;
};

export type HeaderOptionsProps = {
  showBackButton?: boolean;
  showMenuButton?: boolean;
  onMenuPress?: () => void;
};

export interface ViewerProps {
  visible: boolean;
  onClose: () => void;
  params: {
    name: string;
    path: string;
    nameClass: string;
  };
}

export type IsLoadingProps = {
  size?: "small" | "large";
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export interface ReportViewProps {
  title: string;
  onClose: () => void;
}

export interface EnumItem {
  value: any;
  text: string;
}

export interface PropsEnum {
  visible: boolean;
  title: string;
  items: EnumItem[];
  onClose: () => void;
  onSelect: (value: any) => void;
}

export type AddItemAssetProps = {
  onPress?: (() => void) | string;
  field?: any;
  nameClass?: string;
  onCreated?: () => void;
};

export interface HandleCascadeChangeProps {
  name: string;
  value: any;
  fieldActive: any[];
  setFormData: Dispatch<SetStateAction<any>>;
  setReferenceData: Dispatch<SetStateAction<Record<string, any[]>>>;
}

export interface RenderInputByTypeProps {
  f: Field;
  formData: any;
  enumData: any;
  referenceData: any;
  images?: any;
  loadingImages?: any;
  handleChange: (name: string, value: any) => void;
  pickImage: any;
  setImages?: any;
  styles: any;

  // picker modal share
  setModalVisible: any;
  setActiveEnumField: any;

  mode: "add" | "edit";
  getDefaultValueForField: (f: Field) => any;
}
