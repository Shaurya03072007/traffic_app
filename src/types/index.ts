export type UserRole = 'admin' | 'officer';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  badgeNumber?: string;
  department?: string;
  phone?: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AIDetectionItem {
  detected: boolean;
  confidence: number;
  details?: string;
  boundingBox?: BoundingBox;
}

export interface ViolationRecord {
  id: string;
  caseNumber: string;
  officerId?: string;
  officerName: string;
  badgeNumber: string;
  vehicleNumber: string;
  location: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  
  // AI visual detections
  helmetViolation: boolean;
  tripleRiding: boolean;
  aiConfidence: number;
  
  // Officer manual observations
  minorRiding: boolean;
  noLicense: boolean;
  drunkDriving: boolean;
  drunkDrivingNotes?: string;
  
  // Metadata & Evidence
  status: 'Pending Review' | 'Challan Generated' | 'Fine Paid' | 'Contested' | 'Dismissed';
  fineAmount: number;
  challanDueDate?: string;
  evidenceVideoUrl?: string;
  evidenceImageUrl?: string;
  officerRemarks?: string;
  modelName?: string;
  createdAt: string;
}

export interface RegisteredVehicle {
  vehicleNumber: string;
  vehicleType: string;
  ownerName: string;
  ownerPhone: string;
  registrationStatus: 'Active' | 'Suspended' | 'Expired' | 'Blacklisted';
  insuranceValidUntil: string;
}

export interface PoliceOfficer {
  id: string;
  name: string;
  badgeNumber: string;
  station: string;
  zone: string;
  phone: string;
  active: boolean;
  casesBooked: number;
}

export interface DemoVideoScenario {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  groundTruth: {
    helmetViolation: boolean;
    tripleRiding: boolean;
    riderCount: number;
    recommendedPlate: string;
  };
}
