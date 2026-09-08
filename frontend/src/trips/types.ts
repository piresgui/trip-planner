export type TripRole = "OWNER" | "EDITOR" | "VIEWER";

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  ownerName: string;
  myRole: TripRole;
}

export interface Participant {
  userId: string;
  name: string;
  email: string;
  role: TripRole;
}
