import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Escape special characters for Supabase PostgREST .or() filter strings
export function pgOr(value: string): string {
  return value.replace(/[%_\\()|,]/g, '\\$&')
}
