export interface Activity {
  id: string;
  itineraryDayId: string;
  time: string;
  location: string;
  description: string;
  estimatedCost: number | null;
  createdById: string;
  createdByName: string;
}

export interface ItineraryDay {
  id: string;
  date: string;
  dayIndex: number;
  activities: Activity[];
}
