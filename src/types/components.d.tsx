// // src/types/components.d.ts

// import React, { PropsWithChildren, ReactElement } from "react";
// import { Field, Item } from "./model.d";
// import { TextInputProps, TextProps, ViewProps } from "react-native";
// import { getFieldValue } from "@/utils/helper";
// import { TAB_ITEMS, TabItem } from "@/app/(dataClass)/details";
// import Ionicons from "react-native-vector-icons/Ionicons";

// // Props cho component CardItem
// export interface CardItemProps {
//   item: Record<string, any>;
//   fields?: Field[];
//   icon?: string;
//   onPress?: (item: Record<string, any>) => void;
// }
// // Props cho SearchBar
// export interface SearchInputProps {
//   visible: boolean;
//   value: string;
//   onChange: (text: string) => void;
// }

// // Props cho phần header của profile
// export interface ProfileHeaderProps {
//   name: string;
//   avatarUrl?: string;
// }

// // Props cho setting item
// export interface SettingItemProps {
//   icon: React.ReactNode;
//   label: string;
//   onPress: () => void;
// }

// // Props cho Dropdown
// export type DropdownProps = {
//   item: Item;
//   level?: number;
//   expandedIds: (string | number)[];
//   onToggle: (id: string | number) => void;
// };

// export interface MenuItemCardProps extends MenuItemComponent {
//   index: number;
// }

// export type Props = PropsWithChildren<{
//   headerImage: ReactElement;
//   headerBackgroundColor: { dark: string; light: string };
// }>;

// export type ScreenOption = {
//   name: string;
//   title?: string;
//   icon: keyof typeof Ionicons;
//   showHeader?: boolean; // <-- Thêm thuộc tính này
// };

// export type TabCustomProps = {
//   screens?: ScreenOption[];
//   showHeader?: boolean; // default cho tất cả tabs nếu tab không khai báo riêng
//   backgroundColor?: string;
//   customHeader?: React.ComponentType<any>;
// };

// export type ThemedTextProps = TextProps & {
//   lightColor?: string;
//   darkColor?: string;
//   type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link";
// };

// export type ThemedTextInputProps = TextInputProps & {
//   lightColor?: string;
//   darkColor?: string;
// };

// export type ThemedViewProps = ViewProps & {
//   lightColor?: string;
//   darkColor?: string;
// };

// export interface TabContentProps {
//   activeTab: string;
//   groupedFields: Record<string, Field[]>;
//   collapsedGroups: Record<string, boolean>;
//   toggleGroup: (groupName: string) => void;
//   getFieldValue: (item: Record<string, any>, field: Field) => string;
//   item: any;
//   previousItem?: any; // 🔥 optional
//   isFieldChanged?: (
//     field: Field,
//     currentItem: any,
//     previousItem: any
//   ) => boolean; // 🔥 optional
// }

// export interface CenterTextProps {
//   text: string;
// }

// export interface GroupListProps {
//   groupedFields: Record<string, Field[]>;
//   collapsedGroups: Record<string, boolean>;
//   toggleGroup: (groupName: string) => void;
//   getFieldValue: (item: Record<string, any>, field: Field) => string;
//   item: any;
//   previousItem?: any; // 🔥 optional
//   isFieldChanged?: (
//     field: Field,
//     currentItem: any,
//     previousItem: any
//   ) => boolean; // 🔥 optional
// }

// export interface BottomBarProps {
//   tabs: readonly TabItem[]; // thêm readonly
//   activeTab: string;
//   onTabPress: (tabKey: string, label: string) => void;
// }
// export interface HeaderContextProps {
//   title: string;
//   setTitle: (t: string) => void;
// }

// export interface DetailsProps {
//   children: (props: {
//     activeTab: string;
//     setActiveTab: (tabKey: string, label: string) => void;
//     groupedFields: Record<string, Field[]>;
//     collapsedGroups: Record<string, boolean>;
//     toggleGroup: (groupName: string) => void;
//     item: any;
//     getFieldValue: typeof getFieldValue;
//     TAB_ITEMS?: typeof TAB_ITEMS;
//   }) => React.ReactNode;
// }

// export interface DetailsHistoryProps {
//   children: (props: {
//     activeTab: string;
//     setActiveTab: (tabKey: string, label: string) => void;
//     groupedFields: Record<string, Field[]>;
//     collapsedGroups: Record<string, boolean>;
//     toggleGroup: (groupName: string) => void;
//     item: any;
//     getFieldValue: typeof getFieldValue;
//     TAB_ITEMS?: typeof TAB_ITEMS;
//     previousItem: any;
//     isFieldChanged: (
//       field: Field,
//       currentItem: any,
//       previousItem: any
//     ) => boolean;
//   }) => React.ReactNode;
// }

// export interface ListContainerProps {
//   name?: string; // name có thể được truyền từ bên ngoài
//   path?: string;
// }

// export interface MenuItemComponent {
//   id: string;
//   label: string;
//   icon?: React.ReactNode; // Dùng cho icon là component React
//   onPress?: () => void;
//   notificationCount?: number;
// }

// export type ListCardAttachFileProps = CardItemProps & {
//   onView?: (item: any) => void;
// };
