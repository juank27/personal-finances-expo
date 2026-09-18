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

interface DatePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (date: string) => void;
}

export function DatePickerDialog({ open, onOpenChange, value, onChange }: DatePickerDialogProps) {
  const [viewMonth, setViewMonth] = useState(() => monthStringFromDate(value || todayISODate()));
  const today = todayISODate();

  const grid = useMemo(() => getMonthGrid(viewMonth), [viewMonth]);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Re-center on the field's current value each time the picker opens.
      setViewMonth(monthStringFromDate(value || todayISODate()));
    }
    onOpenChange(next);
  }

  function selectDay(date: string) {
    onChange(date);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleccionar fecha</DialogTitle>
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
              const isSelected = cell.date === value;
              const isToday = cell.date === today;
              return (
                <View key={cell.date} style={{ width: `${100 / 7}%` }} className="items-center py-1">
                  <Pressable
                    onPress={() => selectDay(cell.date)}
                    className={
                      "h-9 w-9 items-center justify-center rounded-full" +
                      (isSelected ? " bg-primary" : isToday ? " border border-primary" : "")
                    }
                  >
                    <Text
                      className={
                        (isSelected
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
