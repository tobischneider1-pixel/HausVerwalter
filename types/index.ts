export interface Property {
  id: string;
  name: string;
  address: string;
  zip_code: string;
  city: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  size_sqm: number;
  rooms: number;
  status: string;
  type?: string;
  properties?: { name: string };
  persons?: number;
  shares_1000?: number;
  pieces?: number;
}

export interface Tenant {
  id: string;
  unit_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  rent_amount: number;
  utility_advance: number;
  warm_rent: number;
  start_date?: string;
  end_date?: string;
  move_in_date?: string;
  move_out_date?: string;
  units?: { unit_number: string; property_id: string; properties?: { name: string } };
}

export interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_date: string;
  due_date: string;
  type: string;
  status: string;
  notes?: string;
  tenants?: { first_name: string; last_name: string; units?: { unit_number: string } };
}

export interface CostItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  key: string;
  active: boolean;
}

export interface UnitParam {
  sqm: number;
  persons: number;
  shares: number;
  pieces: number;
}

export type DunningLevel = "erinnerung" | "mahnung_1" | "mahnung_2";

export interface DunningData {
  tenant: Tenant;
  property?: Property;
  unit?: Unit;
  month: string; // z.B. "2026-09"
  monthName: string; // z.B. "September 2026"
  level: DunningLevel;
  openAmount: number;
  feeAmount: number;
  totalDue: number;
  dueDate: string;
  senderName: string;
  senderAddress: string;
  bankName: string;
  iban: string;
  bic: string;
  customText?: string;
}

export interface TenantRentStatus {
  tenant: Tenant;
  expectedRent: number;
  paidAmount: number;
  openAmount: number;
  status: "paid" | "partial" | "open";
  payments: Payment[];
}

export type ContractStatus = "Entwurf" | "Versendet" | "Bestätigt" | "Unterschrieben" | "Aktiv" | "Gekündigt";

export interface Contract {
  id: string;
  tenant_id?: string | null;
  tenant_name: string;
  unit_id?: string | null;
  unit_name?: string;
  property_id?: string | null;
  property_address: string;
  start_date: string;
  cold_rent: number;
  utility_costs?: number;
  utility_advance?: number;
  deposit: number;
  special_terms?: string;
  status: ContractStatus | string;
  tenant_signature?: string | null;
  landlord_signature?: string | null;
  signature_data_url?: string | null;
  signing_place?: string;
  signing_timestamp?: string;
  is_archived?: boolean;
  end_date?: string | null;
  cancellation_received_at?: string | null;
  notice_period_months?: number;
  created_at?: string;
  confirmed_at?: string | null;
  tenant_email?: string | null;
}

