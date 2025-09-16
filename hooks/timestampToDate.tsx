import { Timestamp } from "firebase/firestore";

export function timestampToDate(timestamp: Timestamp): Date {
  return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1e6);
}

export const formatDateToSpanish = (dateString: Timestamp): string => {
  const date = timestampToDate(dateString);
  const formatter = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  return formatter.format(date);
};