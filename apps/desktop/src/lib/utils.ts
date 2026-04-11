import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a string for use in PostgREST .or() filters.
 * Escapes characters that break or() syntax: commas, parentheses, periods (in value position).
 * Use: query.or(`title.ilike.%${pgOr(search)}%,desc.ilike.%${pgOr(search)}%`)
 */
export function pgOr(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
