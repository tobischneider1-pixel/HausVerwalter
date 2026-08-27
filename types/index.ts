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