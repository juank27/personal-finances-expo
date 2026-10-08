import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { MonthSelector } from "@/components/month-selector";
import {
  addMonths,
  formatMonthLabel,
  getMonthGrid,
  monthStringFromDate,
  todayISODate,
} from "@/lib/date";

const WEEKDAY_LABELS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

export interface DateRange {
  start: string | null;
  end: string | null;
}

interface DateRangePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DateRange;
  onChange: (range: { start: string; end: string }) => void;
}

export function DateRangePickerDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: DateRangePickerDialogProps) {
  const [viewMonth, setViewMonth] = useState(() =>
    monthStringFromDate(value.start || todayISODate())
  );
  // Local draft selection — only committed via onChange once both ends are picked, so a
  // half-made selection doesn't leak out if the dialog is dismissed mid-pick.
  const [draft, setDraft] = useState<DateRange>(value);
  const today = todayISODate();

  const grid = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(value);
      setViewMonth(monthStringFromDate(value.start || todayISODate()));
    }
    onOpenChange(next);
  }

  function selectDay(date: string) {
    if (!draft.start || draft.end) {
      // First tap of a new range (or starting over after a full range was already picked).
      const next = { start: date, end: null };
      setDraft(next);
      return;
    }

    // Second tap — fixes the other end, swapping if it lands before the start.
    const start = date < draft.start ? date : draft.start;
    const end = date < draft.start ? draft.start : date;
    setDraft({ start, end });
    onChange({ start, end });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleccionar rango de fechas</DialogTitle>
        </DialogHeader>

        <View className="gap-3">
          <MonthSelector
            label={formatMonthLabel(viewMonth)}
            onPrevious={() => setViewMonth((m) => addMonths(m, -1))}
            onNext={() => setViewMonth((m) => addMonths(m, 1))}
          />

          <View className="flex-row">
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} className="flex-1 items-center py-1">
                <Text className="text-xs font-semibold text-muted-foreground">{label}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row flex-wrap">
            {grid.map((cell) => {
              const isStart = cell.date === draft.start;
              const isEnd = cell.date === draft.end;
              const isEndpoint = isStart || isEnd;
              const isInRange =
                !isEndpoint &&
                draft.start !== null &&
                draft.end !== null &&
                cell.date > draft.start &&
                cell.date < draft.end;
              const isToday = cell.date === today;

              return (
                <View key={cell.date} style={{ width: `${100 / 7}%` }} className="items-center py-1">
                  <Pressable
                    onPress={() => selectDay(cell.date)}
                    className={
                      "h-9 w-9 items-center justify-center rounded-full" +
                      (isEndpoint
                        ? " bg-primary"
                        : isInRange
                          ? " bg-primary/20"
                          : isToday
                            ? " border border-primary"
                            : "")
                    }
                  >
                    <Text
                      className={
                        (isEndpoint
                          ? "font-semibold text-primary-foreground"
                          : cell.inMonth
                            ? "text-foreground"
                            : "text-muted-foreground/40") + " text-sm"
                      }
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
}
