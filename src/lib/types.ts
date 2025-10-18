export const PLATFORMS = [
  "Instagram",
  "YouTube",
  "LinkedIn",
  "Facebook",
  "Website",
  "Other",
] as const;

export type Platform = typeof PLATFORMS[number];

export const POST_TYPES = [
  "Reel",
  "Post",
  "Carousel",
  "Blog Post",
] as const;

export type PostType = typeof POST_TYPES[number];

export const POST_STATUSES = [
    "Planned",
    "Edited",
    "Approved",
    "Scheduled",
    "Posted",
    "Missed",
] as const;

export type PostStatus = typeof POST_STATUSES[number];

export const THEME_COLORS = [
  "transparent",
  "#fecaca", // red-200
  "#fed7aa", // orange-200
  "#fef08a", // yellow-200
  "#bbf7d0", // green-200
  "#bfdbfe", // blue-200
  "#e9d5ff", // purple-200
] as const;

export type ThemeColor = typeof THEME_COLORS[number];

export interface Post {
  title: string;
  notes: string;
  types: PostType[];
  platforms: string[]; // Can include Platform or custom strings
  color: ThemeColor;
  status: PostStatus;
  missedReason?: string; // New field for missed posts
}

export type CalendarData = Record<string, Post>; // Key is "YYYY-MM-DD"

export interface Account {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  accountId: string;
  lastModified: {
    seconds: number;
    nanoseconds: number;
  } | Date;
}

export interface Calendar {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  calendarData: CalendarData;
}

export interface ProjectData {
  name: string;
  calendars: Calendar[];
  activeCalendarId: string | null;
  lastModified: Date;
}
