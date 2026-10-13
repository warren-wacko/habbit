import {
  Archive,
  ArrowDown,
  ArrowUp,
  Calendar,
  ChartNoAxesColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Compass,
  Download,
  Ellipsis,
  EllipsisVertical,
  LogOut,
  Minus,
  Pencil,
  Plus,
  Share,
  SkipForward,
  StickyNote,
  Target,
  Trash2,
  User,
  X,
  type LucideIcon,
} from "lucide-react";

// Every interface icon in the app comes from Lucide (https://lucide.dev), drawn
// at one size and one stroke weight. Habit icons live in habitIcons.tsx. The
// names below are the ones the rest of the app imports, so swapping an icon
// only ever happens here.
type IconProps = { className?: string; strokeWidth?: number; size?: number };

function wrap(Glyph: LucideIcon) {
  return function Icon({ className, strokeWidth, size }: IconProps) {
    return (
      <Glyph
        className={className}
        size={size ?? 20}
        strokeWidth={strokeWidth ?? 1.7}
        aria-hidden="true"
      />
    );
  };
}

export const PencilIcon = wrap(Pencil);
export const TrashIcon = wrap(Trash2);
export const ArchiveIcon = wrap(Archive);
export const SkipIcon = wrap(SkipForward);
export const MinusIcon = wrap(Minus);
export const CircleCheckIcon = wrap(CircleCheck);
export const ChartIcon = wrap(ChartNoAxesColumn);
export const UserIcon = wrap(User);
export const TargetIcon = wrap(Target);
export const CalendarDaysIcon = wrap(CalendarDays);
export const EllipsisIcon = wrap(Ellipsis);
export const CompassIcon = wrap(Compass);
export const DownloadIcon = wrap(Download);
export const ChevronDownIcon = wrap(ChevronDown);
export const NoteIcon = wrap(StickyNote);
export const CheckIcon = wrap(Check);
export const CloseIcon = wrap(X);
export const ChevronLeftIcon = wrap(ChevronLeft);
export const ChevronRightIcon = wrap(ChevronRight);
export const CalendarIcon = wrap(Calendar);
export const ShareIcon = wrap(Share);
export const PlusIcon = wrap(Plus);
export const MoreIcon = wrap(EllipsisVertical);
export const LogOutIcon = wrap(LogOut);
export const ArrowUpIcon = wrap(ArrowUp);
export const ArrowDownIcon = wrap(ArrowDown);

// bottom navigation
export const TodayNavIcon = wrap(CircleCheck);
export const ProgressNavIcon = wrap(ChartNoAxesColumn);
export const YouNavIcon = wrap(User);
