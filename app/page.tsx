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

// Exakte Standard-Positionen nach deinen Screenshots
const initialCostItems = [
  // I. Bewirtschaftung (Kosten) - Umlagefähige kalte Betriebskosten
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

  // II. Bewirtschaftung (Kosten) - Umlagefähige warme Betriebskosten
  { id: "heizkosten", name: "Heizkosten gemäß Fremdabrechner", category: "Warm-NK", amount: 2450, key: "Verbrauch / m²", active: true },

  // III. Bewirtschaftung (Erträge)
  { id: "ertrag_wasser", name: "Wasser / Rückerstattung", category: "Ertrag", amount: -60, key: "Wohnfläche (m²)", active: true },

  // IV. Rücklage / Nicht Umlagefähige Positionen
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

  // Zahlungs-Filter
  const [paymentFilterYear, setPaymentFilterYear] = useState<string>("all");
  const [paymentFilterTenant, setPaymentFilterTenant] = useState<string>("all");
  const [paymentFilterStatus, setPaymentFilterStatus] = useState<string>("all");

  // Betriebskosten Unter-Tabs
  const [bkSubTab, setBkSubTab] = useState<"abrechnung" | "belege" | "einheitenaufteilung">("abrechnung");
  const [selectedPropertyForBk, setSelectedPropertyForBk] = useState<string>("");
  const [bkYear, setBkYear] = useState<string>("2025");

  // Globaler Verteilerschlüssel
  const [globalKeyType, setGlobalKeyType] = useState<string>("Wohnfläche (m²)");

  // Zentraler State für alle Kostenpositionen (damit Änderungen in der Ansicht 1 in Ansicht 2 übernommen werden!)
  const [costItems, setCostItems] = useState(initialCostItems);

  // Lokaler State für die bearbeitbaren Einheiten-Schlüssel im Gebäude (qm, Personen, 1000stel etc.)
  const [buildingUnitParams, setBuildingUnitParams] = useState<Record<string, { sqm: number; persons: number; shares: number; pieces: number }>>({});

  // Gespeicherte Abrechnungsdaten
  const [savedAbrechnungStatus, setSavedAbrechnungStatus] = useState<string>("Nicht gespeichert / Entwurf");
  const [lastSavedData, setLastSavedData] = useState<any>(null);

  // Modals
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [showAddOperatingCostModal, setShowAddOperatingCostModal] = useState(false);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Formulare
  const [newProp, setNewProp] = useState({ name: "", address: "", zip_code: "", city: "" });
  const [newUnit, setNewUnit] = useState({
    property_id: "",
    unit_number: "",
    size_sqm: "",
    rooms: "",
    status: "vermietet",
  });
  const [newTenant, setNewTenant] = useState({
    unit_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    rent_amount: "",
    utility_advance: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  const [newPayment, setNewPayment] = useState({
    tenant_id: "",
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    type: "Miete",
    status: "pünktlich",
    notes: "",
  });

  const [newOperatingCost, setNewOperatingCost] = useState({
    property_id: "",
    unit_id: "",
    kategorie: "Abfallentsorgung",
    betrag: "",
  });

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

    const { data: tenantsData } = await supabase
      .from("tenants")
      .select("*, units(unit_number, property_id, properties(name))");
    if (tenantsData) setTenants(tenantsData as Tenant[]);

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*, tenants(first_name, last_name, units(unit_number))")
      .order("payment_date", { ascending: false });
    if (paymentsData) setPayments(paymentsData as Payment[]);

    const propsCount = propsData?.length || 0;
    const uCount = unitsData?.length || 0;
    const rented = unitsData?.filter((u) => u.status === "vermietet").length || 0;
    const vacant = uCount - rented;

    const coldSum = tenantsData?.reduce((sum, t) => sum + Number(t.rent_amount || 0), 0) || 0;
    const warmSum =
      tenantsData?.reduce(
        (sum, t) => sum + (Number(t.warm_rent) || Number(t.rent_amount || 0) + Number(t.utility_advance || 0)),
        0
      ) || 0;

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

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(val);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("de-DE") : "-");

  const availableYears = Array.from(
    new Set(payments.map((p) => new Date(p.payment_date).getFullYear().toString()))
  ).sort((a, b) => b.localeCompare(a));

  const filteredPayments = payments.filter((p) => {
    const yearMatches =
      paymentFilterYear === "all" ||
      new Date(p.payment_date).getFullYear().toString() === paymentFilterYear;
    const tenantMatches =
      paymentFilterTenant === "all" || p.tenant_id === paymentFilterTenant;
    const statusMatches =
      paymentFilterStatus === "all" || p.status === paymentFilterStatus;

    return yearMatches && tenantMatches && statusMatches;
  });

  const currentPropertyUnits = units.filter((u) => u.property_id === selectedPropertyForBk);
  const currentPropertyObj = properties.find((p) => p.id === selectedPropertyForBk);

  const totalSqm = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.sqm || Number(u.size_sqm) || 0), 0) || 1;
  const totalPersons = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.persons || 0), 0) || 1;
  const totalShares = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.shares || 0), 0) || 1000;
  const totalPieces = currentPropertyUnits.reduce((sum, u) => sum + (buildingUnitParams[u.id]?.pieces || 0), 0) || 1;

  // Handler zum Ändern einzelner Positionen direkt im State
  const handleItemChange = (id: string, field: string, value: any) => {
    setCostItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#1d2939]">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="fixed left-0 top-0 z-25 flex h-screen w-[230px] flex-col bg-[#12233d] text-white">
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white text-lg">
              ⌂
            </div>
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
          </header>

          <div className="mx-auto max-w-[1450px] p-7">
            {activePage === "Überblick" && (
              <>
                <div>
                  <h2 className="text-[21px] font-bold">Guten Morgen!</h2>
                  <p className="mt-1 text-sm text-gray-500">Hier ist die Übersicht Ihrer Immobilien.</p>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Objekte" value={loading ? "..." : String(stats.propertiesCount)} subtitle="Wohngebäude" icon="▦" iconClass="bg-blue-50 text-blue-600" />
                  <StatCard title="Einheiten" value={loading ? "..." : String(stats.unitsCount)} subtitle="Wohnungen / Einheiten" icon="▥" iconClass="bg-green-50 text-green-600" />
                  <StatCard title="Vermietet" value={loading ? "..." : String(stats.rentedUnits)} subtitle={stats.unitsCount > 0 ? `${Math.round((stats.rentedUnits / stats.unitsCount) * 100)} %` : "0 %"} icon="♙" iconClass="bg-orange-50 text-orange-600" />
                  <StatCard title="Leerstehend" value={loading ? "..." : String(stats.vacantUnits)} subtitle={stats.unitsCount > 0 ? `${Math.round((stats.vacantUnits / stats.unitsCount) * 100)} %` : "0 %"} icon="⌂" iconClass="bg-red-50 text-red-500" />
                  <StatCard title="Einnahmen (diesen Monat)" value={loading ? "..." : formatEuro(stats.totalPaidThisMonth)} subtitle={`Soll (Warm): ${formatEuro(stats.totalWarmRent)}`} icon="€" iconClass="bg-green-50 text-green-600" green />
                </div>
              </>
            )}

            {/* BETRIEBSKOSTEN (EXAKTE REIHENFOLGE NACH SCREENSHOTS) */}
            {activePage === "Betriebskosten" && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-[21px] font-bold">Betriebskosten & Gebäude-Abrechnung</h2>
                    <p className="text-sm text-gray-500">Erfassen und aufteilen nach deinen genauen Vorlagen.</p>
                  </div>

                  <div className="flex rounded-xl bg-gray-200/70 p-1">
                    <button
                      onClick={() => setBkSubTab("abrechnung")}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                        bkSubTab === "abrechnung" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      📊 Gesamtkosten erfassen
                    </button>
                    <button
                      onClick={() => setBkSubTab("einheitenaufteilung")}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                        bkSubTab === "einheitenaufteilung" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      🏢 Aufteilung nach Wohnung ({currentPropertyObj?.name || "Objekt"}) {lastSavedData ? "🟢" : ""}
                    </button>
                    <button
                      onClick={() => setBkSubTab("belege")}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                        bkSubTab === "belege" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      📁 Belege
                    </button>
                  </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-4 items-center justify-between rounded-xl border border-[#e7ebf2] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-700">📍 Objekt:</span>
                      <select
                        value={selectedPropertyForBk}
                        onChange={(e) => setSelectedPropertyForBk(e.target.value)}
                        className="rounded-lg border border-blue-300 bg-blue-50/50 p-2 text-xs font-bold text-blue-900"
                      >
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} — {p.city}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Abrechnungsjahr:</span>
                      <select
                        value={bkYear}
                        onChange={(e) => setBkYear(e.target.value)}
                        className="rounded-lg border border-gray-200 p-2 text-xs bg-gray-50 font-medium"
                      >
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

                {/* UNTERMENÜ 1: GESAMTKOSTEN (EXAKTE REIHENFOLGE) */}
                {bkSubTab === "abrechnung" && (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm space-y-8">
                    <div className="flex justify-between items-center border-b pb-3">
                      <h3 className="text-base font-bold text-gray-800">
                        Bewirtschaftung für: <span className="text-blue-600">{currentPropertyObj?.name}</span> ({bkYear})
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-600">Globaler Schlüssel:</span>
                        <select
                          value={globalKeyType}
                          onChange={(e) => {
                            setGlobalKeyType(e.target.value);
                            setCostItems(prev => prev.map(i => ({ ...i, key: e.target.value })));
                          }}
                          className="rounded-lg border border-gray-300 p-1.5 text-xs bg-gray-50 font-semibold"
                        >
                          <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                          <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                          <option value="Personen / Einheiten">Personen / Einheiten</option>
                          <option value="Verbrauch / m²">Verbrauch / m²</option>
                          <option value="Stück">Stück</option>
                          <option value="Pauschal">Pauschal</option>
                        </select>
                      </div>
                    </div>

                    {/* I. Umlagefähige kalte Betriebskosten */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                        Bewirtschaftung (Kosten) – Umlagefähige kalte Betriebskosten
                      </h4>
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
                                <input
                                  type="checkbox"
                                  checked={item.active}
                                  onChange={(e) => handleItemChange(item.id, "active", e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                                />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                {item.name}
                              </td>
                              <td className="p-2">
                                <select
                                  value={item.key}
                                  onChange={(e) => handleItemChange(item.id, "key", e.target.value)}
                                  disabled={!item.active}
                                  className="rounded border border-gray-200 p-1 text-xs bg-gray-50 font-medium"
                                >
                                  <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                                  <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                                  <option value="Personen / Einheiten">Personen / Einheiten</option>
                                  <option value="Verbrauch / m²">Verbrauch / m²</option>
                                  <option value="Stück">Stück</option>
                                  <option value="Pauschal">Pauschal</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount}
                                  onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)}
                                  disabled={!item.active}
                                  className="w-28 rounded border border-gray-200 p-1 text-right text-xs bg-gray-50 font-semibold"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* II. Umlagefähige warme Betriebskosten */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                        Bewirtschaftung (Kosten) – Umlagefähige warme Betriebskosten
                      </h4>
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
                                <input
                                  type="checkbox"
                                  checked={item.active}
                                  onChange={(e) => handleItemChange(item.id, "active", e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                                />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-gray-800"}`}>
                                {item.name}
                              </td>
                              <td className="p-2">
                                <select
                                  value={item.key}
                                  onChange={(e) => handleItemChange(item.id, "key", e.target.value)}
                                  disabled={!item.active}
                                  className="rounded border border-gray-200 p-1 text-xs bg-gray-50 font-medium"
                                >
                                  <option value="Verbrauch / m²">Verbrauch / m²</option>
                                  <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                                  <option value="Pauschal">Pauschal</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount}
                                  onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)}
                                  disabled={!item.active}
                                  className="w-28 rounded border border-gray-200 p-1 text-right text-xs bg-gray-50 font-semibold"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* III. Bewirtschaftung (Erträge) - Negative Werte / Erstattungen */}
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 border-b border-emerald-200 pb-2 mb-3">
                        III. Bewirtschaftung (Erträge) (z. B. negative Werte / Rückzahlungen wie -60,00 €)
                      </h4>
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
                                <input
                                  type="checkbox"
                                  checked={item.active}
                                  onChange={(e) => handleItemChange(item.id, "active", e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 cursor-pointer"
                                />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-emerald-900"}`}>
                                {item.name}
                              </td>
                              <td className="p-2">
                                <select
                                  value={item.key}
                                  onChange={(e) => handleItemChange(item.id, "key", e.target.value)}
                                  disabled={!item.active}
                                  className="rounded border border-emerald-200 p-1 text-xs bg-white font-medium"
                                >
                                  <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
                                  <option value="Pauschal">Pauschal</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount}
                                  onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)}
                                  disabled={!item.active}
                                  className="w-28 rounded border border-emerald-300 p-1 text-right text-xs bg-white font-semibold text-emerald-700"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* IV. Nicht Umlagefähige Positionen */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                      <h4 className="text-sm font-bold text-amber-900 border-b border-amber-200 pb-2 mb-3">
                        IV. Nicht Umlagefähige Positionen (Vermieter-Ansicht)
                      </h4>
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
                                <input
                                  type="checkbox"
                                  checked={item.active}
                                  onChange={(e) => handleItemChange(item.id, "active", e.target.checked)}
                                  className="h-4 w-4 rounded border-gray-300 text-amber-600 cursor-pointer"
                                />
                              </td>
                              <td className={`p-2 font-medium ${!item.active ? "text-gray-400 line-through" : "text-amber-900"}`}>
                                {item.name}
                              </td>
                              <td className="p-2">
                                <select
                                  value={item.key}
                                  onChange={(e) => handleItemChange(item.id, "key", e.target.value)}
                                  disabled={!item.active}
                                  className="rounded border border-amber-200 p-1 text-xs bg-white font-medium"
                                >
                                  <option value="Pauschal">Pauschal</option>
                                  <option value="Anteile (1000stel)">Anteile (1000stel)</option>
                                  <option value="Stück">Stück</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.amount}
                                  onChange={(e) => handleItemChange(item.id, "amount", parseFloat(e.target.value) || 0)}
                                  disabled={!item.active}
                                  className="w-28 rounded border border-amber-300 p-1 text-right text-xs bg-white font-semibold"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-3 border-t pt-4">
                      <button
                        onClick={() => {
                          setSavedAbrechnungStatus("Übernommen für " + (currentPropertyObj?.name || "Objekt") + " 🚀");
                          setLastSavedData({ year: bkYear, propertyId: selectedPropertyForBk, date: new Date() });
                          setBkSubTab("einheitenaufteilung");
                        }}
                        className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                      >
                        Bestätigen & Aufteilung anzeigen 🚀
                      </button>
                    </div>
                  </div>
                )}

                {/* UNTERMENÜ 2: AUFTEILUNG NACH WOHNUNG */}
                {bkSubTab === "einheitenaufteilung" && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-blue-900 mb-2">
                        1. Parameter je Wohneinheit (m², Personen, 1000stel, Stück)
                      </h3>
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
                                    <input
                                      type="number"
                                      value={pData.sqm}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, sqm: val } });
                                      }}
                                      className="w-full rounded border border-gray-300 p-1 text-xs font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-semibold block">Personen</label>
                                    <input
                                      type="number"
                                      value={pData.persons}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, persons: val } });
                                      }}
                                      className="w-full rounded border border-gray-300 p-1 text-xs font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-semibold block">1000stel Anteile</label>
                                    <input
                                      type="number"
                                      value={pData.shares}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, shares: val } });
                                      }}
                                      className="w-full rounded border border-gray-300 p-1 text-xs font-semibold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 font-semibold block">Stück</label>
                                    <input
                                      type="number"
                                      value={pData.pieces}
                                      onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setBuildingUnitParams({ ...buildingUnitParams, [u.id]: { ...pData, pieces: val } });
                                      }}
                                      className="w-full rounded border border-gray-300 p-1 text-xs font-semibold"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm">
                      <h3 className="text-base font-bold text-gray-800 mb-4 border-b pb-3">
                        2. Aufschlüsselung je Wohnung (inkl. Erträge & geänderter Werte)
                      </h3>

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

                              if (item.category === "Ertrag") {
                                unitErtragSum += valForUnit;
                              } else if (item.category === "Warm-NK") {
                                unitWarmeSum += valForUnit;
                              } else if (item.category === "Kalt-NK") {
                                unitKalteSum += valForUnit;
                              }

                              return { ...item, calculatedVal: valForUnit };
                            });

                            const totalUnitSum = unitKalteSum + unitWarmeSum + unitErtragSum;

                            return (
                              <div key={u.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                                <div className="flex flex-wrap justify-between items-center mb-3 border-b pb-2">
                                  <div>
                                    <span className="font-bold text-sm text-gray-900">{u.unit_number}</span>
                                    <span className="ml-3 text-xs text-gray-600 font-medium">
                                      Mieter: {tenantForUnit ? `${tenantForUnit.first_name} ${tenantForUnit.last_name}` : <span className="text-red-500">Leerstand</span>}
                                    </span>
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

                {/* UNTERMENÜ 3: BELEGE */}
                {bkSubTab === "belege" && (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center shadow-sm">
                    <div className="text-3xl mb-2">📂</div>
                    <h4 className="text-sm font-bold text-gray-800">Belege für {currentPropertyObj?.name}</h4>
                  </div>
                )}
              </div>
            )}

            {["Objekte", "Einheiten", "Mieter", "Zahlungen", "Dokumente", "Termine & Aufgaben", "Schäden & Vorgänge", "Dienstleister", "Berichte", "Einstellungen"].includes(activePage) && activePage !== "Betriebskosten" && (
              <div className="rounded-xl border border-[#e7ebf2] bg-white p-12 text-center text-gray-500">
                Bereich &quot;{activePage}&quot; aktiv.
              </div>
            )}
          </div>
        </main>
      </div>
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