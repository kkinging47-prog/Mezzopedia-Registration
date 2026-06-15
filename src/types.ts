export type Category = 'student' | 'adult';
export type PaymentStatus = 'paid' | 'unpaid' | 'pending';

export interface Registrant {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  payment_status: PaymentStatus;
  unique_code: string;
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
  category: Category;
}

export interface ExcelRowPreview extends UpsertRegistrantInput {
  rowNumber: number;
}
