import { UserProfile, ViolationRecord, RegisteredVehicle, PoliceOfficer, DemoVideoScenario } from '../types';

// Pre-seeded Indian Traffic Police Database
export const INITIAL_VIOLATIONS: ViolationRecord[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    caseNumber: 'TRF-2026-000101',
    officerId: 'd0000000-0000-0000-0000-000000000001',
    officerName: 'Sub-Inspector Vikram Sharma',
    badgeNumber: 'SI-4421',
    vehicleNumber: 'TS09EA4412',
    location: 'Cyber Towers Junction, Hitech City, Hyderabad',
    latitude: 17.4504,
    longitude: 78.3808,
    timestamp: '2026-09-29 08:35:12',
    helmetViolation: true,
    tripleRiding: false,
    aiConfidence: 0.94,
    minorRiding: false,
    noLicense: false,
    drunkDriving: false,
    status: 'Challan Generated',
    fineAmount: 1000,
    challanDueDate: '2026-10-30',
    evidenceVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    evidenceImageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&q=80',
    officerRemarks: 'Rider proceeding towards Mindspace circle without protective headgear. Captured on patrol camera.',
    modelName: 'YOLOv8-TrafficCustom-v1.2',
    createdAt: '2026-09-29T08:35:12Z'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    caseNumber: 'TRF-2026-000102',
    officerId: 'd0000000-0000-0000-0000-000000000001',
    officerName: 'Sub-Inspector Vikram Sharma',
    badgeNumber: 'SI-4421',
    vehicleNumber: 'TS07JH8821',
    location: 'Inorbit Mall Crossroads, Madhapur, Hyderabad',
    latitude: 17.4359,
    longitude: 78.3867,
    timestamp: '2026-09-29 07:15:40',
    helmetViolation: true,
    tripleRiding: true,
    aiConfidence: 0.91,
    minorRiding: true,
    noLicense: true,
    drunkDriving: false,
    status: 'Pending Review',
    fineAmount: 35000, // Compound: Triple riding (1k) + No helmet (1k) + Underage (25k) + No license (5k)
    challanDueDate: '2026-10-30',
    evidenceVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    evidenceImageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&q=80',
    officerRemarks: 'Three youths observed riding two-wheeler at high speed. Driver confirmed juvenile without licence.',
    modelName: 'YOLOv8-TrafficCustom-v1.2',
    createdAt: '2026-09-29T07:15:40Z'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    caseNumber: 'TRF-2026-000103',
    officerId: 'e0000000-0000-0000-0000-000000000002',
    officerName: 'Head Constable Priya Verma',
    badgeNumber: 'HC-8819',
    vehicleNumber: 'DL04BC8921',
    location: 'Kukatpally Y-Junction, NH-65, Hyderabad',
    latitude: 17.4875,
    longitude: 78.4116,
    timestamp: '2026-09-28 22:40:15',
    helmetViolation: false,
    tripleRiding: true,
    aiConfidence: 0.88,
    minorRiding: false,
    noLicense: false,
    drunkDriving: true,
    drunkDrivingNotes: 'Breathalyzer BAC test recorded 68mg/100ml. Vehicle impounded under Section 185 MVA.',
    status: 'Challan Generated',
    fineAmount: 11000, // Drunk driving (10k) + Triple riding (1k)
    challanDueDate: '2026-10-15',
    evidenceVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    evidenceImageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
    officerRemarks: 'Triple riding detected; driver stopped at checkpoint and tested positive for alcohol.',
    modelName: 'YOLOv8-TrafficCustom-v1.2',
    createdAt: '2026-09-28T22:40:15Z'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000004',
    caseNumber: 'TRF-2026-000104',
    officerId: 'e0000000-0000-0000-0000-000000000002',
    officerName: 'Head Constable Priya Verma',
    badgeNumber: 'HC-8819',
    vehicleNumber: 'KA05EQ7714',
    location: 'Gachibowli Outer Ring Road Entry, Hyderabad',
    latitude: 17.4401,
    longitude: 78.3489,
    timestamp: '2026-09-28 16:10:00',
    helmetViolation: true,
    tripleRiding: false,
    aiConfidence: 0.96,
    minorRiding: false,
    noLicense: false,
    drunkDriving: false,
    status: 'Fine Paid',
    fineAmount: 1000,
    challanDueDate: '2026-10-20',
    evidenceVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    evidenceImageUrl: 'https://images.unsplash.com/photo-1558980664-769d59546b3d?w=800&q=80',
    officerRemarks: 'Pillion and rider both without BIS certified safety helmets.',
    modelName: 'YOLOv8-TrafficCustom-v1.2',
    createdAt: '2026-09-28T16:10:00Z'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000005',
    caseNumber: 'TRF-2026-000105',
    officerId: 'd0000000-0000-0000-0000-000000000001',
    officerName: 'Sub-Inspector Vikram Sharma',
    badgeNumber: 'SI-4421',
    vehicleNumber: 'MH12TR3321',
    location: 'Bio-Diversity Park Circle, Old Mumbai Highway',
    latitude: 17.4298,
    longitude: 78.3789,
    timestamp: '2026-09-27 14:22:18',
    helmetViolation: true,
    tripleRiding: true,
    aiConfidence: 0.92,
    minorRiding: false,
    noLicense: true,
    drunkDriving: false,
    status: 'Pending Review',
    fineAmount: 7000,
    challanDueDate: '2026-10-28',
    evidenceVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    evidenceImageUrl: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&q=80',
    officerRemarks: 'Three riders without helmets on modified motorcycle.',
    modelName: 'YOLOv8-TrafficCustom-v1.2',
    createdAt: '2026-09-27T14:22:18Z'
  }
];

export const REGISTERED_VEHICLES: RegisteredVehicle[] = [
  { vehicleNumber: 'TS09EA4412', vehicleType: 'Motorcycle', ownerName: 'Rajesh Kumar Reddy', ownerPhone: '+91 98765 43210', registrationStatus: 'Active', insuranceValidUntil: '2027-05-14' },
  { vehicleNumber: 'TS07JH8821', vehicleType: 'Scooter', ownerName: 'Sunita Sundaram', ownerPhone: '+91 91234 56780', registrationStatus: 'Active', insuranceValidUntil: '2026-12-01' },
  { vehicleNumber: 'DL04BC8921', vehicleType: 'Motorcycle', ownerName: 'Manish Gupta', ownerPhone: '+91 97112 34567', registrationStatus: 'Suspended', insuranceValidUntil: '2025-08-10' },
  { vehicleNumber: 'KA05EQ7714', vehicleType: 'Motorcycle', ownerName: 'Kiran Narayan', ownerPhone: '+91 94800 12345', registrationStatus: 'Active', insuranceValidUntil: '2028-01-30' },
  { vehicleNumber: 'MH12TR3321', vehicleType: 'Motorcycle', ownerName: 'Aditya Joshi', ownerPhone: '+91 98220 99881', registrationStatus: 'Active', insuranceValidUntil: '2027-04-18' },
  { vehicleNumber: 'AP28BK9001', vehicleType: 'Car', ownerName: 'Venkat Rao', ownerPhone: '+91 99490 88771', registrationStatus: 'Active', insuranceValidUntil: '2026-09-30' },
  { vehicleNumber: 'AP9AL7175', vehicleType: 'Scooter', ownerName: 'Priya Test', ownerPhone: '+91 99999 11111', registrationStatus: 'Active', insuranceValidUntil: '2028-12-31' },
  { vehicleNumber: 'TN998281', vehicleType: 'Motorcycle', ownerName: 'Abdul Test', ownerPhone: '+91 99999 22222', registrationStatus: 'Active', insuranceValidUntil: '2026-10-31' }
];

export const POLICE_OFFICERS: PoliceOfficer[] = [
  { id: 'd0000000-0000-0000-0000-000000000001', name: 'Sub-Inspector Vikram Sharma', badgeNumber: 'SI-4421', station: 'Cyberabad Traffic Station', zone: 'West Zone', phone: '+91 94401 55432', active: true, casesBooked: 142 },
  { id: 'e0000000-0000-0000-0000-000000000002', name: 'Head Constable Priya Verma', badgeNumber: 'HC-8819', station: 'Madhapur Traffic Outpost', zone: 'Hitech City Corridor', phone: '+91 99882 33441', active: true, casesBooked: 98 },
  { id: 'e0000000-0000-0000-0000-000000000003', name: 'Assistant Sub-Inspector Manoj Patel', badgeNumber: 'ASI-2190', station: 'Gachibowli Junction Control', zone: 'Financial District', phone: '+91 98221 00998', active: true, casesBooked: 76 }
];

export const DEMO_SCENARIOS: DemoVideoScenario[] = [
  {
    id: 'demo-1',
    title: 'Demo 1: Normal Motorcycle (Compliant)',
    description: 'Motorcycle with single rider wearing a standard safety helmet. Verification passes compliant standards.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&q=80',
    groundTruth: {
      helmetViolation: false,
      tripleRiding: false,
      riderCount: 1,
      recommendedPlate: 'KA05EQ7714'
    }
  },
  {
    id: 'demo-2',
    title: 'Demo 2: Helmet Violation (No Helmet)',
    description: 'Motorcyclist proceeding without protective headgear. AI detects bare head contour with 94% confidence.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&q=80',
    groundTruth: {
      helmetViolation: true,
      tripleRiding: false,
      riderCount: 1,
      recommendedPlate: 'TS09EA4412'
    }
  },
  {
    id: 'demo-3',
    title: 'Demo 3: Triple Riding (3 Riders)',
    description: 'Motorcycle carrying 3 passengers. Rider-vehicle association tracking detects 3 bounding boxes resting on seat plane.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&q=80',
    groundTruth: {
      helmetViolation: false,
      tripleRiding: true,
      riderCount: 3,
      recommendedPlate: 'DL04BC8921'
    }
  },
  {
    id: 'demo-4',
    title: 'Demo 4: Compound Violation (No Helmet + Triple Riding)',
    description: 'Severe multi-infraction case: 3 riders co-riding a two-wheeler, with pillion riders lacking safety helmets.',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=600&q=80',
    groundTruth: {
      helmetViolation: true,
      tripleRiding: true,
      riderCount: 3,
      recommendedPlate: 'TS07JH8821'
    }
  }
];

// Helper to simulate API call latency
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
