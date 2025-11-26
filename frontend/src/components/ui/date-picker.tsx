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
  minDate?: string; // ISO format: yyyy-MM-dd
  maxDate?: string; // ISO format: yyyy-MM-dd
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Convert ISO string (yyyy-MM-dd) to Date object
  // Validate the date before creating Date object to avoid "Invalid time value" error
  // Use useMemo to ensure date is recalculated when value changes
  const date = React.useMemo<Date | undefined>(() => {
    if (value && typeof value === 'string' && value.trim() !== '') {
      try {
        const dateString = value.trim();
        // Check if it matches yyyy-MM-dd format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
          // Parse date components to avoid timezone issues
          const [year, month, day] = dateString.split('-').map(Number);
          const parsedDate = new Date(year, month - 1, day);
          // Check if the date is valid
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }
        }
      } catch (error) {
        console.error('Error parsing date value:', value, error);
      }
    }
    return undefined;
  }, [value]);

  // Convert minDate/maxDate from ISO string to Date object
  let minDateObj: Date | undefined = undefined;
  if (minDate && typeof minDate === 'string' && minDate.trim() !== '') {
    try {
      const dateString = minDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parsedDate = new Date(dateString + "T00:00:00");
        if (!isNaN(parsedDate.getTime())) {
          minDateObj = parsedDate;
        }
      }
    } catch (error) {
      console.error('Error parsing minDate:', minDate, error);
    }
  }

  let maxDateObj: Date | undefined = undefined;
  if (maxDate && typeof maxDate === 'string' && maxDate.trim() !== '') {
    try {
      const dateString = maxDate.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parsedDate = new Date(dateString + "T00:00:00");
        if (!isNaN(parsedDate.getTime())) {
          maxDateObj = parsedDate;
        }
      }
    } catch (error) {
      console.error('Error parsing maxDate:', maxDate, error);
    }
  }

  // Format date for display: DD/MM/YYYY
  // Use useMemo to ensure it recalculates when date changes
  const displayValue = React.useMemo(() => {
    if (date) {
      try {
        return format(date, "dd/MM/yyyy");
      } catch (error) {
        console.error('Error formatting date:', date, error);
        return "";
      }
    }
    return "";
  }, [date]);

  // Get yesterday's date as the default maximum (disable today and future dates)
  const getYesterdayDate = React.useCallback((): Date => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }, []);

  // Create disabled function to prevent selecting dates outside the valid range
  const isDateDisabled = React.useCallback((dateToCheck: Date): boolean => {
    const checkDateOnly = new Date(dateToCheck);
    checkDateOnly.setHours(0, 0, 0, 0);
    
    // Always disable today and future dates (default behavior)
    const yesterday = getYesterdayDate();
    if (checkDateOnly > yesterday) {
      return true;
    }
    
    // Disable dates before minDate (if provided)
    if (minDateObj) {
      const minDateOnly = new Date(minDateObj);
      minDateOnly.setHours(0, 0, 0, 0);
      if (checkDateOnly < minDateOnly) {
        return true;
      }
    }
    
    // Disable dates after maxDate (if provided, and it's more restrictive than yesterday)
    if (maxDateObj) {
      const maxDateOnly = new Date(maxDateObj);
      maxDateOnly.setHours(0, 0, 0, 0);
      // Use the more restrictive date (earlier of maxDateObj or yesterday)
      const effectiveMaxDate = maxDateOnly < yesterday ? maxDateOnly : yesterday;
      if (checkDateOnly > effectiveMaxDate) {
        return true;
      }
    }
    
    return false;
  }, [minDateObj, maxDateObj, getYesterdayDate]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Additional validation: prevent selection if date is disabled
      if (isDateDisabled(selectedDate)) {
        return; // Don't allow selection of disabled dates
      }
      // Convert Date to ISO string (yyyy-MM-dd)
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const isoString = `${year}-${month}-${day}`;
      onChange(isoString);
      // Close the popover after selection
      setOpen(false);
    } else {
      onChange("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          disabled={isDateDisabled}
        />
      </PopoverContent>
    </Popover>
  );
}

