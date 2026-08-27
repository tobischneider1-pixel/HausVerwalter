"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navigation = [
  { name: "Überblick", icon: "⌂" },
  { name: "Objekte", icon: "▦" },
  { name: "Einheiten", icon: "▥" },
  { name: "Mieter", icon: "♙" },
  { name: "Verträge", icon: "▤" },
  { name: "Zahlungen", icon: "€" },
  { name: "Betriebskosten", icon: "◫" },
  { name: "Dokumente", icon: "▱" },
  { name: "Termine & Aufgaben", icon: "◷" },
  { name: "Schäden & Vorgänge", icon: "△" },
  { name: "Dienstleister", icon: "♧" },
  { name: "Berichte", icon: "▤" },
  { name: "Einstellungen", icon: "⚙" },
];

interface Property {
  id: string;
  name: string;
  address: string;
  zip_code: string;
  city: string;
}

interface Unit {
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

interface Tenant {
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

interface Payment {
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

const initialCostItems = [
  { id: "abfall", name: "Abfallentsorgung", category: "Kalt-NK", amount: 640, key: "Wohnfläche (m²)", active: true },
  { id: "oberflaeche", name: "Oberflächenwasser", category: "Kalt-NK", amount: 210, key: "Wohnfläche (m²)", active: true },
  { id: "strassen", name: "Straßenreinigung", category: "Kalt-NK", amount: 150, key: "Wohnfläche (m²)", active: true },
  { id: "haftpflicht", name: "Gebäudehaftpflichtversicherung", category: "Kalt-NK", amount: 320, key: "Wohnfläche (m²)", active: true },
  { id: "leitungswasser", name: "Geb.-Vers. Leitungswasser/Sturm", category: "Kalt-NK", amount: 780, key: "Wohnfläche (m²)", active: true },
  { id: "glasbruch", name: "Glasbruchversicherung", category: "Kalt-NK", amount: 120, key: "Wohnfläche (m²)", active: true },
  { id: "strom_bel", name: "Strom (Beleuchtung)", category: "Kalt-NK", amount: 190, key: "Personen / Einheiten", active: true },
  { id: "garten", name: "Gartenpflege (Fremdfirma)", category: "Kalt-NK", amount: 850, key: "Wohnfläche (m²)", active: true },
  { id: "reinigung", name: "Reinigung (Fremdfirma)", category: "Kalt-NK", amount: 1200, key: "Wohnfläche (m²)", active: true },
  { id: "hausmeister", name: "Hausmeister (Fremdfirma)", category: "Kalt-NK", amount: 1500, key: "Wohnfläche (m²)", active: true },
  { id: "rwm", name: "Wartung RWM", category: "Kalt-NK", amount: 250, key: "Stück", active: true },
  { id: "heizkosten", name: "Heizkosten gemäß Fremdabrechner", category: "Warm-NK", amount: 2450, key: "Verbrauch / m²", active: true },
  { id: "ertrag_wasser", name: "Wasser / Rückerstattung", category: "Ertrag", amount: -60, key: "Wohnfläche (m²)", active: true },
  { id: "rwm_miete", name: "Rauchwarnmelder Miete", category: "Nicht umlagefähig", amount: 120, key: "Stück", active: true },
  { id: "reparaturen", name: "Reparaturen", category: "Nicht umlagefähig", amount: 450, key: "Anteile (1000stel)", active: true },
  { id: "konto", name: "Kontoführungskosten (Giro)", category: "Nicht umlagefähig", amount: 84, key: "Pauschal", active: true },
  { id: "direkt", name: "Kosten Direktzuordnung", category: "Nicht umlagefähig", amount: 0, key: "Pauschal", active: true },
  { id: "verwalter", name: "Verwalterentgelt", category: "Nicht umlagefähig", amount: 960, key: "Pauschal", active: true },
  { id: "verwalter_gem", name: "Verwalterentgelt (gem. Vereinb.)", category: "Nicht umlagefähig", amount: 0, key: "Pauschal", active: true },
];

export default function Home() {
  const [activePage, setActivePage] = useState("Überblick");

  const [stats, setStats] = useState({
    propertiesCount: 0,
    unitsCount: 0,
    rentedUnits: 0,
    vacantUnits: 0,
    totalColdRent: 0,
    totalWarmRent: 0,
    totalPaidThisMonth: 0,
    unpaidTenantsCount: 0,
  });

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [unpaidTenantsList, setUnpaidTenantsList] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Zahlungs-Filter & Detail-States
  const [paymentFilterYear, setPaymentFilterYear] = useState<string>("all");
  const [paymentFilterTenant, setPaymentFilterTenant] = useState<string>("all");
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<string>("all");

  // Betriebskosten Unter-Tabs
  const [bkSubTab, setBkSubTab] = useState<"abrechnung" | "belege" | "einheitenaufteilung">("abrechnung");
  const [selectedPropertyForBk, setSelectedPropertyForBk] = useState<string>("");
  const [bkYear, setBkYear] = useState<string>("2025");
  const [globalKeyType, setGlobalKeyType] = useState<string>("Wohnfläche (m²)");
  const [costItems, setCostItems] = useState(initialCostItems);
  const [buildingUnitParams, setBuildingUnitParams] = useState<Record<string, { sqm: number; persons: number; shares: number; pieces: number }>>({});
  const [savedAbrechnungStatus, setSavedAbrechnungStatus] = useState<string>("Nicht gespeichert / Entwurf");
  const [lastSavedData, setLastSavedData] = useState<any>(null);

  // Modals & erweiterte Formular-States
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedDocumentCategory, setSelectedDocumentCategory] = useState<string>("alle");

  const [newProp, setNewProp] = useState({ name: "", address: "", zip_code: "", city: "" });
  const [newUnit, setNewUnit] = useState({ property_id: "", unit_number: "", size_sqm: "", rooms: "", status: "vermietet" });
  const [newTenant, setNewTenant] = useState({ unit_id: "", first_name: "", last_name: "", email: "", phone: "", rent_amount: "", utility_advance: "", start_date: new Date().toISOString().split("T")[0], end_date: "" });
  const [newPayment, setNewPayment] = useState({ tenant_id: "", amount: "", payment_date: new Date().toISOString().split("T")[0], due_date: new Date().toISOString().split("T")[0], type: "Miete", status: "pünktlich", notes: "" });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const currentUnits = units.filter((u) => u.property_id === selectedPropertyForBk);
    const initialParams: Record<string, { sqm: number; persons: number; shares: number; pieces: number }> = {};
    currentUnits.forEach((u) => {
      initialParams[u.id] = {
        sqm: Number(u.size_sqm) || 70,
        persons: u.persons || 2,
        shares: u.shares_1000 || 250,
        pieces: u.pieces || 3,
      };
    });
    setBuildingUnitParams(initialParams);
  }, [selectedPropertyForBk, units]);

  async function fetchData() {
    setLoading(true);

    const { data: propsData } = await supabase.from("properties").select("*");
    if (propsData) {
      setProperties(propsData);
      if (propsData.length > 0 && !selectedPropertyForBk) {
        setSelectedPropertyForBk(propsData[0].id);
      }
    }

    const { data: unitsData } = await supabase.from("units").select("*, properties(name)");
    if (unitsData) setUnits(unitsData as Unit[]);

    const { data: tenantsData } = await supabase.from("tenants").select("*, units(unit_number, property_id, properties(name))");
    if (tenantsData) setTenants(tenantsData as Tenant[]);

    const { data: paymentsData } = await supabase.from("payments").select("*, tenants(first_name, last_name, units(unit_number))").order("payment_date", { ascending: false });
    if (paymentsData) setPayments(paymentsData as Payment[]);

    const propsCount = propsData?.length || 0;
    const uCount = unitsData?.length || 0;
    const rented = unitsData?.filter((u) => u.status === "vermietet").length || 0;
    const vacant = uCount - rented;

    const coldSum = tenantsData?.reduce((sum, t) => sum + Number(t.rent_amount || 0), 0) || 0;
    const warmSum = tenantsData?.reduce((sum, t) => sum + (Number(t.warm_rent) || Number(t.rent_amount || 0) + Number(t.utility_advance || 0)), 0) || 0;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthPayments = paymentsData?.filter((p) => {
      const pDate = new Date(p.payment_date);
      return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    });

    const paidSum = currentMonthPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0;
    const paidTenantIds = new Set(currentMonthPayments?.map((p) => p.tenant_id));
    const unpaid = (tenantsData as Tenant[])?.filter((t) => !paidTenantIds.has(t.id)) || [];

    setUnpaidTenantsList(unpaid);

    setStats({
      propertiesCount: propsCount,
      unitsCount: uCount,
      rentedUnits: rented,
      vacantUnits: vacant,
      totalColdRent: coldSum,
      totalWarmRent: warmSum,
      totalPaidThisMonth: paidSum,
      unpaidTenantsCount: unpaid.length,
    });

    setLoading(false);
  }

  async function handleAddProperty(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("properties").insert([newProp]);
    if (!error) {
      setShowAddPropModal(false);
      setNewProp({ name: "", address: "", zip_code: "", city: "" });
      fetchData();
    }
  }

  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("units").insert([{
      property_id: newUnit.property_id,
      unit_number: newUnit.unit_number,
      size_sqm: parseFloat(newUnit.size_sqm) || 0,
      rooms: parseInt(newUnit.rooms) || 1,
      status: newUnit.status,
    }]);
    if (!error) {
      setShowAddUnitModal(false);
      setNewUnit({ property_id: "", unit_number: "", size_sqm: "", rooms: "", status: "vermietet" });
      fetchData();
    }
  }

  async function handleAddTenant(e: React.FormEvent) {
    e.preventDefault();
    const rent = parseFloat(newTenant.rent_amount) || 0;
    const advance = parseFloat(newTenant.utility_advance) || 0;
    const { error } = await supabase.from("tenants").insert([{
      unit_id: newTenant.unit_id,
      first_name: newTenant.first_name,
      last_name: newTenant.last_name,
      email: newTenant.email,
      phone: newTenant.phone,
      rent_amount: rent,
      utility_advance: advance,
      warm_rent: rent + advance,
      start_date: newTenant.start_date,
    }]);
    if (!error) {
      setShowAddTenantModal(false);
      setNewTenant({ unit_id: "", first_name: "", last_name: "", email: "", phone: "", rent_amount: "", utility_advance: "", start_date: new Date().toISOString().split("T")[0], end_date: "" });
      fetchData();
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("payments").insert([{
      tenant_id: newPayment.tenant_id,
      amount: parseFloat(newPayment.amount) || 0,
      payment_date: newPayment.payment_date,
      due_date: newPayment.due_date,
      type: newPayment.type,
      status: newPayment.status,
      notes: newPayment.notes,
    }]);
    if (!error) {
      setShowAddPaymentModal(false);
      setNewPayment({ tenant_id: "", amount: "", payment_date: new Date().toISOString().split("T")[0], due_date: new Date().toISOString().split("T")[0], type: "Miete", status: "pünktlich", notes: "" });
      fetchData();
    }
  }

  const formatEuro = (val: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(val);
  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("de-DE") : "-");

  const availableYears = Array.from(new Set(payments.map((p) => new Date(p.payment_date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));
  const filteredPayments = payments.filter((p) => {
    const yearMatches = paymentFilterYear === "all" || new Date(p.payment_date).getFullYear().toString() === paymentFilterYear;
    const tenantMatches = paymentFilterTenant === "all" || p.tenant_id === paymentFilterTenant;
    const statusMatches = paymentFilterStatus === "all" || p.status === paymentFilterStatus;
    return yearMatches && tenantMatches && statusMatches;
  });

  const currentPropertyUnits = units.filter((u) => u.property_id === selectedPropertyForBk);
  const currentPropertyObj = properties.find((p) => p.id === selectedPropertyForBk);

  const totalSqm = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.sqm || Number(u.size_sqm) || 0), 0) || 1;
  const totalPersons = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.persons || 0), 0) || 1;
  const totalShares = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.shares || 0), 0) || 1000;
  const totalPieces = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.pieces || 0), 0) || 1;

  const handleItemChange = (id: string, field: string, value: any) => {
    setCostItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#1d2939]">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="fixed left-0 top-0 z-25 flex h-screen w-[230px] flex-col bg-[#12233d] text-white">
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white text-lg">⌂</div>
            <div className="text-lg font-bold tracking-tight">HausVerwalter</div>
          </div>

          <nav className="flex-1 px-3 overflow-y-auto">
            {navigation.map((item) => {
              const active = activePage === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActivePage(item.name)}
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    active ? "bg-[#2f6fd0] text-white" : "text-[#d5deeb] hover:bg-[#1c3558]"
                  }`}
                >
                  <span className="w-5 text-center text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN */}
        <main className="ml-[230px] min-h-screen flex-1">
          <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-[#e7ebf2] bg-white px-8">
            <h1 className="text-[23px] font-bold">{activePage}</h1>
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-gray-500">Demo-Verwaltung aktiv</span>
            </div>
          </header>

          <div className="mx-auto max-w-[1450px] p-7">
            {/* ÜBERBLICK */}
            {activePage === "Überblick" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[21px] font-bold">Guten Morgen!</h2>
                  <p className="mt-1 text-sm text-gray-500">Hier ist die vollständige Übersicht Ihrer Immobilien und Kennzahlen.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Objekte" value={loading ? "..." : String(stats.propertiesCount)} subtitle="Wohngebäude" icon="▦" iconClass="bg-blue-50 text-blue-600" />
                  <StatCard title="Einheiten" value={loading ? "..." : String(stats.unitsCount)} subtitle="Wohnungen / Einheiten" icon="▥" iconClass="bg-green-50 text-green-600" />
                  <StatCard title="Vermietet" value={loading ? "..." : String(stats.rentedUnits)} subtitle={stats.unitsCount > 0 ? `${Math.round((stats.rentedUnits / stats.unitsCount) * 100)} %` : "0 %"} icon="♙" iconClass="bg-orange-50 text-orange-600" />
                  <StatCard title="Leerstehend" value={loading ? "..." : String(stats.vacantUnits)} subtitle={stats.unitsCount > 0 ? `${Math.round((stats.vacantUnits / stats.unitsCount) * 100)} %` : "0 %"} icon="⌂" iconClass="bg-red-50 text-red-500" />
                  <StatCard title="Einnahmen (diesen Monat)" value={loading ? "..." : formatEuro(stats.totalPaidThisMonth)} subtitle={`Soll (Warm): ${formatEuro(stats.totalWarmRent)}`} icon="€" iconClass="bg-green-50 text-green-600" green />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Offene Mietzahlungen (Diesen Monat)</h3>
                    {unpaidTenantsList.length === 0 ? (
                      <p className="text-xs text-green-600 font-semibold py-4">🎉 Alle Mieter haben für diesen Monat bezahlt!</p>
                    ) : (
                      <div className="space-y-3">
                        {unpaidTenantsList.map((t) => (
                          <div key={t.id} className="flex justify-between items-center p-3 rounded-lg bg-red-50/50 border border-red-100 text-xs">
                            <div>
                              <span className="font-bold text-gray-900">{t.first_name} {t.last_name}</span>
                              <span className="text-gray-500 ml-2">({t.units?.unit_number})</span>
                            </div>
                            <span className="font-bold text-red-600">{formatEuro(t.warm_rent || t.rent_amount + t.utility_advance)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Schnellstart / Aktionen</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setShowAddPropModal(true)} className="p-3 rounded-xl border border-gray-200 text-left hover:bg-gray-50 transition text-xs">
                        <div className="font-bold text-blue-600 mb-1">+ Objekt anlegen</div>
                        <div className="text-gray-400 text-[10px]">Neues Gebäude hinzufügen</div>
                      </button>
                      <button onClick={() => setShowAddUnitModal(true)} className="p-3 rounded-xl border border-gray-200 text-left hover:bg-gray-50 transition text-xs">
                        <div className="font-bold text-green-600 mb-1">+ Einheit anlegen</div>
                        <div className="text-gray-400 text-[10px]">Wohnung zuordnen</div>
                      </button>
                      <button onClick={() => setShowAddTenantModal(true)} className="p-3 rounded-xl border border-gray-200 text-left hover:bg-gray-50 transition text-xs">
                        <div className="font-bold text-orange-600 mb-1">+ Mieter zuweisen</div>
                        <div className="text-gray-400 text-[10px]">Mietvertrag erfassen</div>
                      </button>
                      <button onClick={() => setShowAddPaymentModal(true)} className="p-3 rounded-xl border border-gray-200 text-left hover:bg-gray-50 transition text-xs">
                        <div className="font-bold text-purple-600 mb-1">+ Zahlung erfassen</div>
                        <div className="text-gray-400 text-[10px]">Zahlungseingang verbuchen</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* OBJEKTE */}
            {activePage === "Objekte" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Ihre Gebäude & Objekte</h2>
                    <p className="text-sm text-gray-500">Verwalten Sie hier alle Liegenschaften.</p>
                  </div>
                  <button onClick={() => setShowAddPropModal(true)} className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    + Objekt anlegen
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((p) => (
                    <div key={p.id} className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm">
                      <h3 className="font-bold text-base text-gray-900 mb-1">{p.name}</h3>
                      <p className="text-xs text-gray-500 mb-4">{p.address}, {p.zip_code} {p.city}</p>
                      <div className="border-t pt-3 flex justify-between text-xs text-gray-600">
                        <span>Einheiten: {units.filter(u => u.property_id === p.id).length}</span>
                        <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => { setSelectedPropertyForBk(p.id); setActivePage("Betriebskosten"); }}>Abrechnung öffnen →</span>
                      </div>
                    </div>
                  ))}
                  {properties.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-gray-500 text-sm">Noch keine Objekte vorhanden. Legen Sie Ihr erstes Objekt an.</div>
                  )}
                </div>
              </div>
            )}

            {/* EINHEITEN */}
            {activePage === "Einheiten" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Wohneinheiten</h2>
                    <p className="text-sm text-gray-500">Übersicht aller Wohnungen und Gewerbeeinheiten.</p>
                  </div>
                  <button onClick={() => setShowAddUnitModal(true)} className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    + Einheit anlegen
                  </button>
                </div>

                <div className="rounded-xl border border-[#e7ebf2] bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                      <tr>
                        <th className="p-3">Einheit</th>
                        <th className="p-3">Gebäude</th>
                        <th className="p-3">Größe (m²)</th>
                        <th className="p-3">Zimmer</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {units.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">{u.unit_number}</td>
                          <td className="p-3 text-gray-600">{u.properties?.name || "-"}</td>
                          <td className="p-3">{u.size_sqm} m²</td>
                          <td className="p-3">{u.rooms}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${u.status === "vermietet" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {u.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MIETER */}
            {activePage === "Mieter" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Mieterübersicht</h2>
                    <p className="text-sm text-gray-500">Alle aktiven Mietverhältnisse und Kontaktdaten.</p>
                  </div>
                  <button onClick={() => setShowAddTenantModal(true)} className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    + Mieter zuweisen
                  </button>
                </div>

                <div className="rounded-xl border border-[#e7ebf2] bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                      <tr>
                        <th className="p-3">Mieter</th>
                        <th className="p-3">Einheit</th>
                        <th className="p-3">E-Mail / Telefon</th>
                        <th className="p-3 text-right">Kaltmiete</th>
                        <th className="p-3 text-right">Warmmiete</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">{t.first_name} {t.last_name}</td>
                          <td className="p-3 text-gray-600">{t.units?.unit_number} ({t.units?.properties?.name})</td>
                          <td className="p-3 text-gray-500">{t.email} | {t.phone}</td>
                          <td className="p-3 text-right">{formatEuro(t.rent_amount)}</td>
                          <td className="p-3 text-right font-bold text-blue-600">{formatEuro(t.warm_rent || t.rent_amount + t.utility_advance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VERTRÄGE */}
            {activePage === "Verträge" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Mietverträge</h2>
                    <p className="text-sm text-gray-500">Übersicht aller Vertragsdetails und Mietstrukturen.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                      <tr>
                        <th className="p-3">Mieter</th>
                        <th className="p-3">Einheit</th>
                        <th className="p-3">Beginn</th>
                        <th className="p-3 text-right">Kaltmiete</th>
                        <th className="p-3 text-right">Vorauszahlung</th>
                        <th className="p-3 text-right">Gesamt (Warm)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold">{t.first_name} {t.last_name}</td>
                          <td className="p-3 text-gray-600">{t.units?.unit_number}</td>
                          <td className="p-3">{formatDate(t.start_date)}</td>
                          <td className="p-3 text-right">{formatEuro(t.rent_amount)}</td>
                          <td className="p-3 text-right">{formatEuro(t.utility_advance)}</td>
                          <td className="p-3 text-right font-bold text-blue-600">{formatEuro(t.warm_rent || t.rent_amount + t.utility_advance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ZAHLUNGEN */}
            {activePage === "Zahlungen" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Zahlungseingänge</h2>
                    <p className="text-sm text-gray-500">Überwachen Sie Mietzahlungen und Zahlungseingänge.</p>
                  </div>
                  <button onClick={() => setShowAddPaymentModal(true)} className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    + Zahlung erfassen
                  </button>
                </div>

                <div className="mb-4 flex flex-wrap gap-3 items-center rounded-xl border border-[#e7ebf2] bg-white p-4 shadow-sm text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-500">Jahr:</span>
                    <select value={paymentFilterYear} onChange={(e) => setPaymentFilterYear(e.target.value)} className="rounded border p-1.5 bg-gray-50">
                      <option value="all">Alle Jahre</option>
                      {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-500">Mieter:</span>
                    <select value={paymentFilterTenant} onChange={(e) => setPaymentFilterTenant(e.target.value)} className="rounded border p-1.5 bg-gray-50">
                      <option value="all">Alle Mieter</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-500">Status:</span>
                    <select value={paymentFilterStatus} onChange={(e) => setPaymentFilterStatus(e.target.value)} className="rounded border p-1.5 bg-gray-50">
                      <option value="all">Alle Status</option>
                      <option value="pünktlich">pünktlich</option>
                      <option value="ausstehend">ausstehend</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e7ebf2] bg-white shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                      <tr>
                        <th className="p-3">Datum</th>
                        <th className="p-3">Mieter</th>
                        <th className="p-3">Einheit</th>
                        <th className="p-3 text-right">Betrag</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="p-3">{formatDate(p.payment_date)}</td>
                          <td className="p-3 font-bold">{p.tenants?.first_name} {p.tenants?.last_name}</td>
                          <td className="p-3 text-gray-600">{p.tenants?.units?.unit_number}</td>
                          <td className="p-3 text-right font-bold text-green-600">{formatEuro(p.amount)}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-[10px] font-bold">{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* BETRIEBSKOSTEN */}
            {activePage === "Betriebskosten" && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-[21px] font-bold">Betriebskosten & Gebäude-Abrechnung</h2>
                    <p className="text-sm text-gray-500">Erfassen und aufteilen nach deinen genauen Vorlagen.</p>
                  </div>

                  <div className="flex rounded-xl bg-gray-200/70 p-1">
                    <button onClick={() => setBkSubTab("abrechnung")} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${bkSubTab === "abrechnung" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                      📊 Gesamtkosten erfassen
                    </button>
                    <button onClick={() => setBkSubTab("einheitenaufteilung")} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${bkSubTab === "einheitenaufteilung" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                      🏢 Aufteilung nach Wohnung ({currentPropertyObj?.name || "Objekt"}) {lastSavedData ? "🟢" : ""}
                    </button>
                    <button onClick={() => setBkSubTab("belege")} className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${bkSubTab === "belege" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>
                      📁 Belege
                    </button>
                  </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-4 items-center justify-between rounded-xl border border-[#e7ebf2] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">📍 Objekt:</span>
                      <select value={selectedPropertyForBk} onChange={(e) => setSelectedPropertyForBk(e.target.value)} className="rounded-lg border border-blue-300 bg-blue-50/50 p-2 text-xs font-bold text-blue-900">
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Abrechnungsjahr:</span>
                      <select value={bkYear} onChange={(e) => setBkYear(e.target.value)} className="rounded-lg border border-gray-200 p-2 text-xs bg-gray-50 font-medium">
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                    Status: {savedAbrechnungStatus}
                  </div>
                </div>

                {bkSubTab === "abrechnung" && (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm space-y-8">
                    <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="text-base font-bold text-gray-800">
                        Bewirtschaftung für: <span className="text-blue-600">{currentPropertyObj?.name}</span> ({bkYear})
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">Globaler Schlüssel:</span>
                        <select value={globalKeyType} onChange={(e) => { setGlobalKeyType(e.target.value); setCostItems(prev => prev.map(i => ({ ...i, key: e.target.value }))); }} className="rounded-lg border border-gray-300 p-1.5 text-xs bg-gray-50 font-semibold">
                          <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                          <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                          <option value="Personen / Einheiten">Personen / Einheiten</option>
                          <option value="Verbrauch / m²">Verbrauch / m²</option>
                          <option value="Stück">Stück</option>
                          <option value="Pauschal">Pauschal</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">Bewirtschaftung (Kosten) – Umlagefähige kalte Betriebskosten</h4>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="p-2 w-10 text-center">Aktiv</th>
                            <th className="p-2">Kostenart</th>
                            <th className="p-2">Verteilerschlüssel</th>
                            <th className="p-2 text-right">Gesamtkosten (€)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {costItems.filter(i => i.category === "Kalt-NK").map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="p-2 text-center">
                                <input type="checkbox" checked={item.active} onChange={(e) => handleItemChange(item.id, "active", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-gray-800"}`}>{item.name}</td>
                              <td className="p-2">
                                <select value={item.key} onChange={(e) => handleItemChange(item.id, "key", e.target.value)} disabled={!item.active} className="rounded border border-gray-200 p-1 text-xs bg-gray-50 font-medium">
                                  <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                                  <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                                  <option value="Personen / Einheiten">Personen / Einheiten</option>
                                  <option value="Verbrauch / m²">Verbrauch / m²</option>
                                  <option value="Stück">Stück</option>
                                  <option value="Pauschal">Pauschal</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)} disabled={!item.active} className="w-28 rounded border border-gray-200 p-1 text-right text-xs bg-gray-50 font-semibold" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">Bewirtschaftung (Kosten) – Umlagefähige warme Betriebskosten</h4>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="p-2 w-10 text-center">Aktiv</th>
                            <th className="p-2">Kostenart</th>
                            <th className="p-2">Verteilerschlüssel</th>
                            <th className="p-2 text-right">Gesamtkosten (€)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {costItems.filter(i => i.category === "Warm-NK").map(item => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="p-2 text-center">
                                <input type="checkbox" checked={item.active} onChange={(e) => handleItemChange(item.id, "active", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer" />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-gray-800"}`}>{item.name}</td>
                              <td className="p-2">
                                <select value={item.key} onChange={(e) => handleItemChange(item.id, "key", e.target.value)} disabled={!item.active} className="rounded border border-gray-200 p-1 text-xs bg-gray-50 font-medium">
                                  <option value="Verbrauch / m²">Verbrauch / m²</option>
                                  <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                                  <option value="Pauschal">Pauschal</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)} disabled={!item.active} className="w-28 rounded border border-gray-200 p-1 text-right text-xs bg-gray-50 font-semibold" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 border-b border-emerald-200 pb-2 mb-3">III. Bewirtschaftung (Erträge) (z. B. negative Werte / Rückzahlungen wie -60,00 €)</h4>
                      <table className="w-full text-left text-xs bg-emerald-50/40 rounded-lg">
                        <thead className="bg-emerald-100/50 text-emerald-900">
                          <tr>
                            <th className="p-2 w-10 text-center">Aktiv</th>
                            <th className="p-2">Ertragsart</th>
                            <th className="p-2">Verteilerschlüssel</th>
                            <th className="p-2 text-right">Ertrag / Minderung (€)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-200">
                          {costItems.filter(i => i.category === "Ertrag").map(item => (
                            <tr key={item.id} className="hover:bg-emerald-50">
                              <td className="p-2 text-center">
                                <input type="checkbox" checked={item.active} onChange={(e) => handleItemChange(item.id, "active", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-emerald-600 cursor-pointer" />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-emerald-900"}`}>{item.name}</td>
                              <td className="p-2">
                                <select value={item.key} onChange={(e) => handleItemChange(item.id, "key", e.target.value)} disabled={!item.active} className="rounded border border-emerald-200 p-1 text-xs bg-white font-medium">
                                  <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                                  <option value="Pauschal">Pauschal</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)} disabled={!item.active} className="w-28 rounded border border-emerald-300 p-1 text-right text-xs bg-white font-semibold text-emerald-700" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                      <h4 className="text-sm font-bold text-amber-900 border-b border-amber-200 pb-2 mb-3">IV. Nicht Umlagefähige Positionen (Vermieter-Ansicht)</h4>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-100/50 text-amber-900">
                          <tr>
                            <th className="p-2 w-10 text-center">Aktiv</th>
                            <th className="p-2">Position</th>
                            <th className="p-2">Verteilerschlüssel</th>
                            <th className="p-2 text-right">Betrag (€)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-200">
                          {costItems.filter(i => i.category === "Nicht umlagefähig").map(item => (
                            <tr key={item.id} className="hover:bg-amber-50">
                              <td className="p-2 text-center">
                                <input type="checkbox" checked={item.active} onChange={(e) => handleItemChange(item.id, "active", e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-amber-600 cursor-pointer" />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-amber-900"}`}>{item.name}</td>
                              <td className="p-2">
                                <select value={item.key} onChange={(e) => handleItemChange(item.id, "key", e.target.value)} disabled={!item.active} className="rounded border border-amber-200 p-1 text-xs bg-white font-medium">
                                  <option value="Pauschal">Pauschal</option>
                                  <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                                  <option value="Stück">Stück</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input type="number" step="0.01" value={item.amount} onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)} disabled={!item.active} className="w-28 rounded border border-amber-300 p-1 text-right text-xs bg-white font-semibold" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <button onClick={() => { setSavedAbrechnungStatus("Übernommen für " + (currentPropertyObj?.name || "Objekt") + " 🚀"); setLastSavedData({ year: bkYear, propertyId: selectedPropertyForBk, date: new Date() }); setBkSubTab("einheitenaufteilung"); }} className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                        Bestätigen & Aufteilung anzeigen 🚀
                      </button>
                    </div>
                  </div>
                )}

                {bkSubTab === "einheitenaufteilung" && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-blue-900 mb-2">1. Parameter je Wohneinheit (m², Personen, 1000stel, Stück)</h3>
                      {currentPropertyUnits.length === 0 ? (
                        <div className="text-xs text-gray-500">Keine Einheiten im gewählten Gebäude vorhanden.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentPropertyUnits.map((u) => {
                            const pData = buildingUnitParams[u.id] || { sqm: 70, persons: 2, shares: 250, pieces: 3 };
                            return (
                              <div key={u.id} className="rounded-lg border border-blue-200 bg-white p-3 shadow-xs">
                                <div className="font-bold text-xs text-gray-800 mb-2 border-b pb-1 flex justify-between">
                                  <span>{u.unit_number}</span>
                                  <span className="text-blue-600 font-normal">{u.status}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-semibold block">Wohnfläche (m²)</label>
                                    <input type="number" value={pData.sqm} onChange={(e) => setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, sqm: Number(e.target.value) } })} className="w-full rounded border border-gray-300 p-1 text-xs font-semibold" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-semibold block">Personen</label>
                                    <input type="number" value={pData.persons} onChange={(e) => setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, persons: Number(e.target.value) } })} className="w-full rounded border border-gray-300 p-1 text-xs font-semibold" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-semibold block">1000stel Anteile</label>
                                    <input type="number" value={pData.shares} onChange={(e) => setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, shares: Number(e.target.value) } })} className="w-full rounded border border-gray-300 p-1 text-xs font-semibold" />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-semibold block">Stück</label>
                                    <input type="number" value={pData.pieces} onChange={(e) => setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, pieces: Number(e.target.value) } })} className="w-full rounded border border-gray-300 p-1 text-xs font-semibold" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm">
                      <h3 className="text-base font-bold text-gray-800 mb-4 border-b pb-3">2. Aufschlüsselung je Wohnung (inkl. Erträge & geänderter Werte)</h3>

                      {currentPropertyUnits.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 text-xs">Keine Einheiten vorhanden.</div>
                      ) : (
                        <div className="space-y-6">
                          {currentPropertyUnits.map((u) => {
                            const tenantForUnit = tenants.find((t) => t.unit_id === u.id);
                            const pData = buildingUnitParams[u.id] || { sqm: 70, persons: 2, shares: 250, pieces: 3 };

                            let unitKalteSum = 0;
                            let unitWarmeSum = 0;
                            let unitErtragSum = 0;

                            const calculatedRows = costItems.filter(i => i.active).map((item) => {
                              let shareFactor = 0;
                              if (item.key.includes("Wohnfläche") || item.key.includes("Verbrauch")) {
                                shareFactor = pData.sqm / totalSqm;
                              } else if (item.key.includes("Personen")) {
                                shareFactor = pData.persons / totalPersons;
                              } else if (item.key.includes("1000stel")) {
                                shareFactor = pData.shares / totalShares;
                              } else if (item.key.includes("Stück")) {
                                shareFactor = pData.pieces / totalPieces;
                              } else {
                                shareFactor = 1 / currentPropertyUnits.length;
                              }

                              const valForUnit = item.amount * shareFactor;
                              if (item.category === "Ertrag") unitErtragSum += valForUnit;
                              else if (item.category === "Warm-NK") unitWarmeSum += valForUnit;
                              else if (item.category === "Kalt-NK") unitKalteSum += valForUnit;

                              return { ...item, calculatedVal: valForUnit };
                            });

                            const totalUnitSum = unitKalteSum + unitWarmeSum + unitErtragSum;

                            return (
                              <div key={u.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <div className="flex flex-wrap justify-between items-center mb-3 border-b pb-2">
                                  <div>
                                    <span className="font-bold text-sm text-gray-900">{u.unit_number}</span>
                                    <span className="ml-3 text-xs text-gray-600 font-medium">Mieter: {tenantForUnit ? `${tenantForUnit.first_name} ${tenantForUnit.last_name}` : <span className="text-red-500">Leerstand</span>}</span>
                                  </div>
                                  <div className="flex gap-4 text-xs font-semibold">
                                    <span className="text-blue-600 font-bold">Summe (Monat): {formatEuro(totalUnitSum / 12)}</span>
                                  </div>
                                </div>

                                <table className="w-full text-left text-xs bg-white rounded-lg border border-gray-200 overflow-hidden">
                                  <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                      <th className="p-2">Position</th>
                                      <th className="p-2">Kategorie</th>
                                      <th className="p-2 text-right">Anteil (€ / Jahr)</th>
                                      <th className="p-2 text-right">Monat (€)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {calculatedRows.map((row, rIdx) => (
                                      <tr key={rIdx} className={row.category === "Ertrag" ? "bg-emerald-50/60 text-emerald-900" : row.category === "Nicht umlagefähig" ? "bg-amber-50/40 text-amber-900" : "hover:bg-gray-50"}>
                                        <td className="p-2 font-medium">{row.name}</td>
                                        <td className="p-2 text-gray-500">{row.category}</td>
                                        <td className={`p-2 text-right font-semibold ${row.calculatedVal < 0 ? "text-emerald-600" : ""}`}>{formatEuro(row.calculatedVal)}</td>
                                        <td className="p-2 text-right text-gray-600">{formatEuro(row.calculatedVal / 12)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50 font-bold text-gray-800 border-t">
                                    <tr>
                                      <td colSpan={2} className="p-2">Gesamtsumme inkl. Erträge</td>
                                      <td className="p-2 text-right text-blue-600">{formatEuro(totalUnitSum)}</td>
                                      <td className="p-2 text-right text-blue-600">{formatEuro(totalUnitSum / 12)}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {bkSubTab === "belege" && (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center shadow-sm">
                    <div className="text-3xl mb-2">📂</div>
                    <h4 className="text-sm font-bold text-gray-800">Belege & Rechnungen für {currentPropertyObj?.name}</h4>
                    <p className="text-xs text-gray-400 mt-1">Hier können Sie Rechnungs-PDFs hochladen und den Kosten zuordnen.</p>
                  </div>
                )}
              </div>
            )}

            {/* DOKUMENTE */}
            {activePage === "Dokumente" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Dokumentenarchiv</h2>
                    <p className="text-sm text-gray-500">Verträge, Abrechnungen und Vorlagen zentral verwalten.</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                      + Dokument hochladen
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex gap-2">
                  {["alle", "mietverträge", "abrechnungen", "versicherung"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedDocumentCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${selectedDocumentCategory === cat ? "bg-[#2f6fd0] text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-[#e7ebf2] bg-white p-8 text-center shadow-sm text-gray-500 text-xs">
                  📁 Noch keine Dokumente im Archiv hinterlegt. Klicken Sie auf „Dokument hochladen“, um Dateien hinzuzufügen.
                </div>
              </div>
            )}

            {/* TERMINE & AUFGABEN */}
            {activePage === "Termine & Aufgaben" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Termine & Aufgaben</h2>
                    <p className="text-sm text-gray-500">Wartungen, Fristen und To-Dos im Blick behalten.</p>
                  </div>
                  <button className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    + Aufgabe anlegen
                  </button>
                </div>
                <div className="rounded-xl border border-[#e7ebf2] bg-white p-8 text-center shadow-sm text-gray-500 text-xs">
                  ✅ Keine offenen Aufgaben oder Fristen eingetragen.
                </div>
              </div>
            )}

            {/* SCHÄDEN & VORGÄNGE */}
            {activePage === "Schäden & Vorgänge" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Schäden & Vorgänge</h2>
                    <p className="text-sm text-gray-500">Schadensmeldungen und Reparaturaufträge dokumentieren.</p>
                  </div>
                  <button className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    + Schadensmeldung erfassen
                  </button>
                </div>
                <div className="rounded-xl border border-[#e7ebf2] bg-white p-8 text-center shadow-sm text-gray-500 text-xs">
                  🔧 Keine aktiven Schadensfälle gemeldet.
                </div>
              </div>
            )}

            {/* DIENSTLEISTER */}
            {activePage === "Dienstleister" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Dienstleister & Handwerker</h2>
                    <p className="text-sm text-gray-500">Kontakte von Hausmeistern, Handwerkern und Versicherungen.</p>
                  </div>
                  <button className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition">
                    + Dienstleister hinzufügen
                  </button>
                </div>
                <div className="rounded-xl border border-[#e7ebf2] bg-white p-8 text-center shadow-sm text-gray-500 text-xs">
                  👷 Keine Dienstleister hinterlegt.
                </div>
              </div>
            )}

            {/* BERICHTE */}
            {activePage === "Berichte" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Berichte & Auswertungen</h2>
                    <p className="text-sm text-gray-500">Finanzübersichten, Einnahmen- und Ausgaben-Reports.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#e7ebf2] bg-white p-8 text-center shadow-sm text-gray-500 text-xs">
                  📊 Berichte werden generiert, sobald ausreichend Buchungsdaten vorliegen.
                </div>
              </div>
            )}

            {/* EINSTELLUNGEN */}
            {activePage === "Einstellungen" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Einstellungen</h2>
                    <p className="text-sm text-gray-500">Verwaltungsprofil, Bankverbindungen und System-Parameter.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm space-y-4 text-xs max-w-xl">
                  <div>
                    <label className="font-bold block mb-1">Name des Verwalters / Firma</label>
                    <input type="text" defaultValue="HausVerwalter GmbH & Co. KG" className="w-full rounded border p-2 bg-gray-50" />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Standard-IBAN für Mieteingänge</label>
                    <input type="text" defaultValue="DE12 3456 7890 1234 5678 90" className="w-full rounded border p-2 bg-gray-50" />
                  </div>
                  <button className="rounded bg-[#2f6fd0] px-4 py-2 font-semibold text-white hover:bg-blue-700 transition">
                    Änderungen speichern
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODALS */}
      {showAddPropModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold mb-4">Neues Objekt anlegen</h3>
            <form onSubmit={handleAddProperty} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Bezeichnung</label>
                <input type="text" required value={newProp.name} onChange={(e) => setNewProp({ ...newProp, name: e.target.value })} className="w-full rounded border p-2" placeholder="z. B. Mehrfamilienhaus Hauptstr. 10" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Straße & Hausnummer</label>
                <input type="text" required value={newProp.address} onChange={(e) => setNewProp({ ...newProp, address: e.target.value })} className="w-full rounded border p-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">PLZ</label>
                  <input type="text" required value={newProp.zip_code} onChange={(e) => setNewProp({ ...newProp, zip_code: e.target.value })} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Stadt</label>
                  <input type="text" required value={newProp.city} onChange={(e) => setNewProp({ ...newProp, city: e.target.value })} className="w-full rounded border p-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddPropModal(false)} className="rounded border px-4 py-2 font-semibold">Abbrechen</button>
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold mb-4">Neue Einheit anlegen</h3>
            <form onSubmit={handleAddUnit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Objekt</label>
                <select required value={newUnit.property_id} onChange={(e) => setNewUnit({ ...newUnit, property_id: e.target.value })} className="w-full rounded border p-2 bg-white">
                  <option value="">Bitte wählen...</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Einheiten-Bezeichnung (z. B. Wohnung 1)</label>
                <input type="text" required value={newUnit.unit_number} onChange={(e) => setNewUnit({ ...newUnit, unit_number: e.target.value })} className="w-full rounded border p-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Größe (m²)</label>
                  <input type="number" step="0.1" required value={newUnit.size_sqm} onChange={(e) => setNewUnit({ ...newUnit, size_sqm: e.target.value })} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Zimmer</label>
                  <input type="number" required value={newUnit.rooms} onChange={(e) => setNewUnit({ ...newUnit, rooms: e.target.value })} className="w-full rounded border p-2" />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Status</label>
                <select value={newUnit.status} onChange={(e) => setNewUnit({ ...newUnit, status: e.target.value })} className="w-full rounded border p-2 bg-white">
                  <option value="vermietet">vermietet</option>
                  <option value="leerstand">leerstand</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddUnitModal(false)} className="rounded border px-4 py-2 font-semibold">Abbrechen</button>
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddTenantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold mb-4">Mieter zuweisen</h3>
            <form onSubmit={handleAddTenant} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Einheit</label>
                <select required value={newTenant.unit_id} onChange={(e) => setNewTenant({ ...newTenant, unit_id: e.target.value })} className="w-full rounded border p-2 bg-white">
                  <option value="">Bitte wählen...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.unit_number} ({u.properties?.name})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Vorname</label>
                  <input type="text" required value={newTenant.first_name} onChange={(e) => setNewTenant({ ...newTenant, first_name: e.target.value })} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nachname</label>
                  <input type="text" required value={newTenant.last_name} onChange={(e) => setNewTenant({ ...newTenant, last_name: e.target.value })} className="w-full rounded border p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">E-Mail</label>
                  <input type="email" value={newTenant.email} onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Telefon</label>
                  <input type="text" value={newTenant.phone} onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })} className="w-full rounded border p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Kaltmiete (€)</label>
                  <input type="number" step="0.01" required value={newTenant.rent_amount} onChange={(e) => setNewTenant({ ...newTenant, rent_amount: e.target.value })} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Nebenkosten-Vorauszahlung (€)</label>
                  <input type="number" step="0.01" required value={newTenant.utility_advance} onChange={(e) => setNewTenant({ ...newTenant, utility_advance: e.target.value })} className="w-full rounded border p-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddTenantModal(false)} className="rounded border px-4 py-2 font-semibold">Abbrechen</button>
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold mb-4">Zahlung erfassen</h3>
            <form onSubmit={handleAddPayment} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold block mb-1">Mieter</label>
                <select required value={newPayment.tenant_id} onChange={(e) => setNewPayment({ ...newPayment, tenant_id: e.target.value })} className="w-full rounded border p-2 bg-white">
                  <option value="">Mieter wählen...</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.units?.unit_number})</option>)}
                </select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Betrag (€)</label>
                <input type="number" step="0.01" required value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} className="w-full rounded border p-2" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Zahlungsdatum</label>
                  <input type="date" required value={newPayment.payment_date} onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })} className="w-full rounded border p-2" />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Fälligkeit</label>
                  <input type="date" required value={newPayment.due_date} onChange={(e) => setNewPayment({ ...newPayment, due_date: e.target.value })} className="w-full rounded border p-2" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddPaymentModal(false)} className="rounded border px-4 py-2 font-semibold">Abbrechen</button>
                <button type="submit" className="rounded bg-blue-600 px-4 py-2 font-semibold text-white">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, iconClass, green }: { title: string; value: string; subtitle: string; icon: string; iconClass: string; green?: boolean }) {
  return (
    <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">{title}</span>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold ${iconClass}`}>{icon}</div>
      </div>
      <div className={`mt-3 text-2xl font-bold ${green ? "text-green-600" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-400">{subtitle}</div>
    </div>
  );
}