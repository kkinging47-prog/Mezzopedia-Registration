export type Category = 'student' | 'adult';
export type PaymentStatus = 'paid' | 'unpaid' | 'pending';

export interface Registrant {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  payment_status: PaymentStatus;
  unique_code: string;
  password: string | null;
  stage: string | null;
  picture_url: string | null;
  category: Category;
  proof_url: string | null;
  proof_filename: string | null;
  proof_uploaded_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationItem {
  id: string;
  registrant_id: string | null;
  registrant_name: string | null;
  type: 'payment_claim' | 'proof_uploaded' | 'status_changed' | string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface UpsertRegistrantInput {
  id?: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  payment_status: PaymentStatus;
  unique_code: string;
  password?: string | null;
  stage?: string | null;
  picture_url?: string | null;
  category: Category;
}

export interface ExcelRowPreview extends UpsertRegistrantInput {
  rowNumber: number;
}

export type FinalistConfirmationStatus = 'pending' | 'confirmed';

export interface LiveFinalist {
  id: string;
  full_name: string;
  class_name: string;
  school_name: string | null;
  school_location: string | null;
  region: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  travel_from: string | null;
  companion_name: string | null;
  companion_relationship: string | null;
  companion_phone: string | null;
  accommodation_required: boolean | null;
  accommodation_note: string | null;
  reporting_date: string;
  confirmation_status: FinalistConfirmationStatus;
  confirmed_at: string | null;
}

export interface LiveFinalistAdmin extends LiveFinalist {
  unique_code: string;
}

export interface LiveFinalistUpdate {
  school_name: string;
  school_location: string;
  region: string;
  email: string;
  phone: string;
  whatsapp: string;
  travel_from: string;
  companion_name: string;
  companion_relationship: string;
  companion_phone: string;
  accommodation_required: boolean;
  accommodation_note: string;
}
