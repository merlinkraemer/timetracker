"use client";

import * as React from "react";
import { ChevronDown } from "@mynaui/icons-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateTimePickerProps {
  date?: Date;
  onDateTimeChange?: (date: Date) => void;
  dateLabel?: string;
  timeLabel?: string;
  className?: string;
}

export function DateTimePicker({
  date,
  onDateTimeChange,
  dateLabel = "Date",
  timeLabel = "Time",
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    date
  );

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate && selectedDate) {
      // Preserve the time when changing date
      const updatedDate = new Date(newDate);
      updatedDate.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        selectedDate.getSeconds()
      );
      setSelectedDate(updatedDate);
      onDateTimeChange?.(updatedDate);
    } else if (newDate) {
      setSelectedDate(newDate);
      onDateTimeChange?.(newDate);
    }
    setOpen(false);
  };

  const handleTimeChange = (timeString: string) => {
    if (selectedDate && timeString) {
      const [hours, minutes, seconds] = timeString.split(":").map(Number);
      const updatedDate = new Date(selectedDate);
      updatedDate.setHours(hours || 0, minutes || 0, seconds || 0);
      setSelectedDate(updatedDate);
      onDateTimeChange?.(updatedDate);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`flex gap-3 w-full ${className || ""}`}>
      <div className="flex flex-col gap-3 flex-1">
        {dateLabel && (
          <Label htmlFor="date-picker" className="px-1">
            {dateLabel}
          </Label>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-full justify-between font-normal"
            >
              {selectedDate ? selectedDate.toLocaleDateString() : "Select date"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {timeLabel && (
          <Label htmlFor="time-picker" className="px-1">
            {timeLabel}
          </Label>
        )}
        <Input
          type="time"
          id="time-picker"
          value={selectedDate ? formatTime(selectedDate) : ""}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none w-full"
        />
      </div>
    </div>
  );
}
