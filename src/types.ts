export interface Booking {
  start: number; // minutes from midnight (0–1440)
  end: number;
  purpose: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  blocked: boolean;
  blockedReason?: string;
  bookings: Booking[];
}

export interface AvailabilityResult {
  available: boolean;
  reasons: string[];
}
