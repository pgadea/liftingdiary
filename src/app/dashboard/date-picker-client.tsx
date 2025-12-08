"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DatePicker } from "@/components/date-picker";

interface DashboardDatePickerProps {
  selectedDate: Date;
}

function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DashboardDatePicker({ selectedDate }: DashboardDatePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (date: Date) => {
    // Update URL with new date, which will trigger server-side refetch
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", formatDateToLocalString(date));
    router.push(`/dashboard?${params.toString()}`);
  };

  return <DatePicker selectedDate={selectedDate} onDateChange={handleDateChange} />;
}
