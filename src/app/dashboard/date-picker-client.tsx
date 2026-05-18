"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/date-picker";

interface DashboardDatePickerProps {
  dateString: string;
}

function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DashboardDatePicker({ dateString }: DashboardDatePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse on the client so the date is in the user's local timezone
  const selectedDate = parseDateString(dateString);

  const handleDateChange = (date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", formatDateToLocalString(date));
    router.push(`/dashboard?${params.toString()}`);
  };

  return <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />;
}
