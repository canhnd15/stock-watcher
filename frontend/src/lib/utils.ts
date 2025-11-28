import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number with dot separators (e.g., 100000 → "100.000")
 */
export function formatNumberWithDots(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  
  // Convert to string and remove any existing dots
  const numStr = String(value).replace(/\./g, "");
  
  // If empty or not a valid number, return as is
  if (numStr === "" || isNaN(Number(numStr))) return numStr;
  
  // Split into integer and decimal parts
  const parts = numStr.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add dots every 3 digits from right to left
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // Combine with decimal part if exists
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}

/**
 * Parse a formatted number string back to a plain number string (removes dots)
 * e.g., "100.000" → "100000"
 */
export function parseFormattedNumber(value: string): string {
  if (!value) return "";
  // Remove all dots
  return value.replace(/\./g, "");
}