import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // ISO format: yyyy-MM-dd
  onChange: (value: string) => void; // Returns ISO format: yyyy-MM-dd
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
}: DatePickerProps) {
  // Convert ISO string (yyyy-MM-dd) to Date object
  // Validate the date before creating Date object to avoid "Invalid time value" error
  let date: Date | undefined = undefined;
  if (value && typeof value === 'string' && value.trim() !== '') {
    try {
      const dateString = value.trim();
      // Check if it matches yyyy-MM-dd format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parsedDate = new Date(dateString + "T00:00:00");
        // Check if the date is valid
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate;
        }
      }
    } catch (error) {
      console.error('Error parsing date value:', value, error);
    }
  }

  // Format date for display: DD/MM/YYYY
  const displayValue = date ? format(date, "dd/MM/yyyy") : "";

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Convert Date to ISO string (yyyy-MM-dd)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const isoString = `${year}-${month}-${day}`;
      onChange(isoString);
    } else {
      onChange("");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

