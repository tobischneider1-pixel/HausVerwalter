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
  units?: { unit_number: string; properties?: { name: string } };
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
  const [bkSubTab, setBkSubTab] = useState<"abrechnung" | "belege">("abrechnung");
  const [selectedPropertyForBk, setSelectedPropertyForBk] = useState<string>("");
  const [bkYear, setBkYear] = useState<string>("2026");

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

  const [editTenantForm, setEditTenantForm] = useState({
    unit_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    rent_amount: "",
    utility_advance: "",
    start_date: "",
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
    tenant_id: "",
    kategorie: "Abfallentsorgung",
    betrag: "",
    rechnungsdatum: new Date().toISOString().split("T")[0],
    zeitraum_von: "",
    zeitraum_bis: "",
    abrechnungsjahr: "2026",
    ist_zwischenabrechnung: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

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
      .select("*, units(unit_number, properties(name))");
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

  async function handleCreateProperty(e: React.FormEvent) {
    e.preventDefault();
    if (!newProp.name || !newProp.address) return;

    const { error } = await supabase.from("properties").insert([newProp]);
    if (!error) {
      setNewProp({ name: "", address: "", zip_code: "", city: "" });
      setShowAddPropModal(false);
      fetchData();
    } else alert("Fehler: " + error.message);
  }

  async function handleCreateUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!newUnit.property_id || !newUnit.unit_number) return;

    const { error } = await supabase.from("units").insert([
      {
        property_id: newUnit.property_id,
        unit_number: newUnit.unit_number,
        size_sqm: Number(newUnit.size_sqm) || 0,
        rooms: Number(newUnit.rooms) || 0,
        status: newUnit.status,
      },
    ]);

    if (!error) {
      setNewUnit({ property_id: "", unit_number: "", size_sqm: "", rooms: "", status: "vermietet" });
      setShowAddUnitModal(false);
      fetchData();
    } else alert("Fehler: " + error.message);
  }

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!newTenant.first_name || !newTenant.last_name || !newTenant.unit_id) return;

    const cold = Number(newTenant.rent_amount) || 0;
    const util = Number(newTenant.utility_advance) || 0;
    const warm = cold + util;

    const { error } = await supabase.from("tenants").insert([
      {
        unit_id: newTenant.unit_id,
        first_name: newTenant.first_name,
        last_name: newTenant.last_name,
        email: newTenant.email,
        phone: newTenant.phone,
        rent_amount: cold,
        utility_advance: util,
        warm_rent: warm,
        start_date: newTenant.start_date || null,
        end_date: newTenant.end_date || null,
      },
    ]);

    if (!error) {
      setNewTenant({
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
      setShowAddTenantModal(false);
      fetchData();
    } else alert("Fehler: " + error.message);
  }

  function openEditTenant(tenant: Tenant) {
    setEditingTenant(tenant);
    setEditTenantForm({
      unit_id: tenant.unit_id || (units.length > 0 ? units[0].id : ""),
      first_name: tenant.first_name || "",
      last_name: tenant.last_name || "",
      email: tenant.email || "",
      phone: tenant.phone || "",
      rent_amount: String(tenant.rent_amount || 0),
      utility_advance: String(tenant.utility_advance || 0),
      start_date: tenant.start_date || "",
      end_date: tenant.end_date || "",
    });
  }

  async function handleUpdateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTenant) return;

    const cold = Number(editTenantForm.rent_amount) || 0;
    const util = Number(editTenantForm.utility_advance) || 0;
    const warm = cold + util;

    const { error } = await supabase
      .from("tenants")
      .update({
        unit_id: editTenantForm.unit_id,
        first_name: editTenantForm.first_name,
        last_name: editTenantForm.last_name,
        email: editTenantForm.email,
        phone: editTenantForm.phone,
        rent_amount: cold,
        utility_advance: util,
        warm_rent: warm,
        start_date: editTenantForm.start_date || null,
        end_date: editTenantForm.end_date || null,
      })
      .eq("id", editingTenant.id);

    if (!error) {
      setEditingTenant(null);
      fetchData();
    } else alert("Fehler beim Aktualisieren: " + error.message);
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!newPayment.tenant_id || !newPayment.amount) return;

    const { error } = await supabase.from("payments").insert([
      {
        tenant_id: newPayment.tenant_id,
        amount: Number(newPayment.amount),
        payment_date: newPayment.payment_date,
        due_date: newPayment.due_date,
        type: newPayment.type,
        status: newPayment.status,
        notes: newPayment.notes,
      },
    ]);

    if (!error) {
      setNewPayment({
        tenant_id: "",
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        due_date: new Date().toISOString().split("T")[0],
        type: "Miete",
        status: "pünktlich",
        notes: "",
      });
      setShowAddPaymentModal(false);
      fetchData();
    } else alert("Fehler beim Erfassen der Zahlung: " + error.message);
  }

  async function handleCreateOperatingCost(e: React.FormEvent) {
    e.preventDefault();
    if (!newOperatingCost.property_id || !newOperatingCost.betrag) return;
    
    alert("Beleg/Rechnung erfolgreich hochgeladen und erfasst!");
    setShowAddOperatingCostModal(false);
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

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#1d2939]">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="fixed left-0 top-0 z-20 flex h-screen w-[230px] flex-col bg-[#12233d] text-white">
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
            {/* ÜBERBLICK */}
            {activePage === "Überblick" && (
              <>
                <div>
                  <h2 className="text-[21px] font-bold">Guten Morgen!</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Hier ist die Übersicht Ihrer Immobilien (Live aus Supabase).
                  </p>
                </div>

                {!loading && stats.unpaidTenantsCount > 0 && (
                  <div className="mt-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <div className="font-bold text-sm">
                          {stats.unpaidTenantsCount} Mieter haben in diesem Monat noch nicht gezahlt!
                        </div>
                        <div className="text-xs text-red-600 mt-0.5">
                          Ausstandartig: {unpaidTenantsList.map((t) => `${t.first_name} ${t.last_name}`).join(", ")}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActivePage("Zahlungen")}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                    >
                      Zahlungen prüfen →
                    </button>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <StatCard title="Objekte" value={loading ? "..." : String(stats.propertiesCount)} subtitle="Wohngebäude" icon="▦" iconClass="bg-blue-50 text-blue-600" />
                  <StatCard title="Einheiten" value={loading ? "..." : String(stats.unitsCount)} subtitle="Wohnungen / Einheiten" icon="▥" iconClass="bg-green-50 text-green-600" />
                  <StatCard title="Vermietet" value={loading ? "..." : String(stats.rentedUnits)} subtitle={stats.unitsCount > 0 ? `${Math.round((stats.rentedUnits / stats.unitsCount) * 100)} %` : "0 %"} icon="♙" iconClass="bg-orange-50 text-orange-600" />
                  <StatCard title="Leerstehend" value={loading ? "..." : String(stats.vacantUnits)} subtitle={stats.unitsCount > 0 ? `${Math.round((stats.vacantUnits / stats.unitsCount) * 100)} %` : "0 %"} icon="⌂" iconClass="bg-red-50 text-red-500" />
                  <StatCard title="Einnahmen (diesen Monat)" value={loading ? "..." : formatEuro(stats.totalPaidThisMonth)} subtitle={`Soll (Warm): ${formatEuro(stats.totalWarmRent)}`} icon="€" iconClass="bg-green-50 text-green-600" green />
                </div>
              </>
            )}

            {/* OBJEKTE */}
            {activePage === "Objekte" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Ihre Objekte</h2>
                    <p className="text-sm text-gray-500">Verwalten Sie hier alle Gebäude und Verwaltereinheiten.</p>
                  </div>
                  <button onClick={() => setShowAddPropModal(true)} className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition">
                    + Objekt hinzufügen
                  </button>
                </div>

                {loading ? <div>Lade Objekte...</div> : properties.length === 0 ? (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center">Keine Objekte vorhanden.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {properties.map((prop) => (
                      <div key={prop.id} className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-sm">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 text-lg font-bold">▦</div>
                        <h3 className="mt-4 text-base font-bold">{prop.name}</h3>
                        <p className="mt-1 text-xs text-gray-500">{prop.address}</p>
                        <p className="text-xs text-gray-500">{prop.zip_code} {prop.city}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* EINHEITEN */}
            {activePage === "Einheiten" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Einheiten</h2>
                    <p className="text-sm text-gray-500">Übersicht aller Wohnungen und Gewerbeeinheiten.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (properties.length === 0) return alert("Legen Sie zuerst ein Objekt an!");
                      setNewUnit({ ...newUnit, property_id: properties[0].id });
                      setShowAddUnitModal(true);
                    }}
                    className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    + Einheit hinzufügen
                  </button>
                </div>

                {loading ? <div>Lade Einheiten...</div> : units.length === 0 ? (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center">Keine Einheiten vorhanden.</div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#e7ebf2] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-[#e7ebf2] bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="p-4">Einheit / Nr.</th>
                          <th className="p-4">Objekt</th>
                          <th className="p-4">Fläche</th>
                          <th className="p-4">Zimmer</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e7ebf2]">
                        {units.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="p-4 font-semibold">{u.unit_number}</td>
                            <td className="p-4 text-gray-600">{u.properties?.name || "-"}</td>
                            <td className="p-4 text-gray-600">{u.size_sqm} m²</td>
                            <td className="p-4 text-gray-600">{u.rooms}</td>
                            <td className="p-4">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.status === "vermietet" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* MIETER */}
            {activePage === "Mieter" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Mieter</h2>
                    <p className="text-sm text-gray-500">Verwalten Sie Mieterdaten, Mietzeiträume und Kosten.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (units.length === 0) return alert("Legen Sie zuerst eine Einheit an!");
                      setNewTenant({ ...newTenant, unit_id: units[0].id });
                      setShowAddTenantModal(true);
                    }}
                    className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    + Mieter hinzufügen
                  </button>
                </div>

                {loading ? <div>Lade Mieter...</div> : tenants.length === 0 ? (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center">Keine Mieter vorhanden.</div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#e7ebf2] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-[#e7ebf2] bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="p-4">Name</th>
                          <th className="p-4">Objekt & Einheit</th>
                          <th className="p-4">Mietzeitraum</th>
                          <th className="p-4">Kontakt</th>
                          <th className="p-4">Kaltmiete</th>
                          <th className="p-4">NK-Vorausz.</th>
                          <th className="p-4">Warmmiete</th>
                          <th className="p-4 text-right">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e7ebf2]">
                        {tenants.map((t) => {
                          const cold = Number(t.rent_amount || 0);
                          const util = Number(t.utility_advance || 0);
                          const warm = Number(t.warm_rent || cold + util);

                          return (
                            <tr key={t.id} className="hover:bg-gray-50">
                              <td className="p-4 font-semibold">{t.first_name} {t.last_name}</td>
                              <td className="p-4 text-gray-600">{t.units?.properties?.name} ({t.units?.unit_number})</td>
                              <td className="p-4 text-xs text-gray-600">
                                <div><span className="text-gray-400">Seit:</span> {formatDate(t.start_date)}</div>
                                <div><span className="text-gray-400">Bis:</span> {t.end_date ? formatDate(t.end_date) : "Unbefristet"}</div>
                              </td>
                              <td className="p-4 text-xs text-gray-600">
                                <div>{t.email || "-"}</div>
                                <div className="text-gray-400">{t.phone || "-"}</div>
                              </td>
                              <td className="p-4 text-gray-700">{formatEuro(cold)}</td>
                              <td className="p-4 text-gray-500">{formatEuro(util)}</td>
                              <td className="p-4 font-bold text-green-600">{formatEuro(warm)}</td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => openEditTenant(t)}
                                  className="rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                                >
                                  Bearbeiten ✏️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ZAHLUNGEN */}
            {activePage === "Zahlungen" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Mietzahlungen & Einnahmen</h2>
                    <p className="text-sm text-gray-500">Erfassen und überwachen Sie alle eingehenden Mietzahlungen.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (tenants.length === 0) return alert("Legen Sie zuerst einen Mieter an!");
                      setNewPayment({ ...newPayment, tenant_id: tenants[0].id, amount: String(tenants[0].warm_rent || 0) });
                      setShowAddPaymentModal(true);
                    }}
                    className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    + Zahlung erfassen
                  </button>
                </div>

                <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-[#e7ebf2] bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Jahr:</span>
                    <select
                      value={paymentFilterYear}
                      onChange={(e) => setPaymentFilterYear(e.target.value)}
                      className="rounded-lg border border-gray-200 p-1.5 text-xs bg-gray-50"
                    >
                      <option value="all">Alle Jahre</option>
                      {availableYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Mieter:</span>
                    <select
                      value={paymentFilterTenant}
                      onChange={(e) => setPaymentFilterTenant(e.target.value)}
                      className="rounded-lg border border-gray-200 p-1.5 text-xs bg-gray-50"
                    >
                      <option value="all">Alle Mieter</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Status:</span>
                    <select
                      value={paymentFilterStatus}
                      onChange={(e) => setPaymentFilterStatus(e.target.value)}
                      className="rounded-lg border border-gray-200 p-1.5 text-xs bg-gray-50"
                    >
                      <option value="all">Alle Status</option>
                      <option value="pünktlich">Pünktlich</option>
                      <option value="unvollständig">Unvollständig</option>
                      <option value="ausstehend">Ausstehend</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div>Lade Zahlungen...</div>
                ) : filteredPayments.length === 0 ? (
                  <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center">Keine Zahlungen für diesen Filter gefunden.</div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#e7ebf2] bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-[#e7ebf2] bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="p-4">Mieter</th>
                          <th className="p-4">Typ</th>
                          <th className="p-4">Eingangsdatum</th>
                          <th className="p-4">Fälligkeit</th>
                          <th className="p-4">Betrag</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Notiz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e7ebf2]">
                        {filteredPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-4 font-semibold">{p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : "Unbekannt"}</td>
                            <td className="p-4 text-gray-600">{p.type}</td>
                            <td className="p-4 text-gray-600">{formatDate(p.payment_date)}</td>
                            <td className="p-4 text-gray-600">{formatDate(p.due_date)}</td>
                            <td className="p-4 font-semibold">{formatEuro(p.amount)}</td>
                            <td className="p-4">{p.status}</td>
                            <td className="p-4 text-gray-500">{p.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* BETRIEBSKOSTEN (STRUKTURIERT NACH VORGABE) */}
            {activePage === "Betriebskosten" && (
              <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <div>
                    <h2 className="text-[21px] font-bold">Betriebskosten & Abrechnung</h2>
                    <p className="text-sm text-gray-500">Erstellen Sie die Jahresabrechnung oder verwalten Sie die zugehörigen Belege.</p>
                  </div>

                  {/* UNTERMENÜ-REITER */}
                  <div className="flex rounded-xl bg-gray-200/70 p-1">
                    <button
                      onClick={() => setBkSubTab("abrechnung")}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                        bkSubTab === "abrechnung" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      📊 Jahresabrechnung
                    </button>
                    <button
                      onClick={() => setBkSubTab("belege")}
                      className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                        bkSubTab === "belege" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      📁 Belege & KI-Upload
                    </button>
                  </div>
                </div>

                {/* FILTER / OBJEKT-AUSWAHL FÜR BEIDE UNTERMENÜS */}
                <div className="mb-6 flex flex-wrap gap-4 items-center rounded-xl border border-[#e7ebf2] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">Gebäude / Objekt:</span>
                    <select
                      value={selectedPropertyForBk}
                      onChange={(e) => setSelectedPropertyForBk(e.target.value)}
                      className="rounded-lg border border-gray-200 p-2 text-xs bg-gray-50 font-medium"
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
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

                {/* UNTERMENÜ 1: JAHRESABRECHNUNG FORMULAR */}
                {bkSubTab === "abrechnung" && (
                  <div className="space-y-6">
                    <div className="rounded-xl border border-[#e7ebf2] bg-white p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 border-b pb-3">
                        <h3 className="text-base font-bold text-gray-800">Übersicht Gebäude-Betriebskosten ({bkYear})</h3>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-semibold">Stichtag: 31.12.{bkYear}</span>
                      </div>

                      <div className="text-xs text-gray-500 mb-6">
                        Erfassen Sie die Gesamtkosten. Nicht umlagefähige Positionen, automatische Erträge (bei Guthaben) und die Rücklagenbildung erscheinen ausschließlich in Ihrer Vermieter-Gesamtübersicht.
                      </div>

                      <div className="overflow-x-auto space-y-8">
                        {/* I. Bewirtschaftung (Kosten) - Umlagefähige kalte Betriebskosten */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                            I. Bewirtschaftung (Kosten) – Umlagefähige kalte Betriebskosten
                          </h4>
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                              <tr>
                                <th className="p-2.5 w-10 text-center">Aktiv</th>
                                <th className="p-2.5">Kostenart</th>
                                <th className="p-2.5">Verteilerschlüssel</th>
                                <th className="p-2.5 text-right">Gesamtkosten (€)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e7ebf2] text-xs">
                              <CostItemRow label="Abfallentsorgung" defaultActive={true} defaultKey="Personen / Einheiten" defaultAmount="640.00" />
                              <CostItemRow label="Oberflächenwasser" defaultActive={true} defaultKey="Wohnfläche (m²)" defaultAmount="210.00" />
                              <CostItemRow label="Straßenreinigung" defaultActive={true} defaultKey="Wohnfläche (m²)" defaultAmount="150.00" />
                              <CostItemRow label="Gebäudehaftpflichtversicherung" defaultActive={true} defaultKey="Anteile (1000stel)" defaultAmount="320.00" />
                              <CostItemRow label="Geb.-Vers. Leitungswasser/Sturm" defaultActive={true} defaultKey="Anteile (1000stel)" defaultAmount="780.00" />
                              <CostItemRow label="Glasbruchversicherung" defaultActive={false} defaultKey="Anteile (1000stel)" defaultAmount="0.00" />
                              <CostItemRow label="Strom (Beleuchtung)" defaultActive={true} defaultKey="Wohnfläche (m²)" defaultAmount="190.00" />
                              <CostItemRow label="Gartenpflege (Fremdfirma)" defaultActive={true} defaultKey="Wohnfläche (m²)" defaultAmount="850.00" />
                              <CostItemRow label="Reinigung (Fremdfirma)" defaultActive={true} defaultKey="Wohnfläche (m²)" defaultAmount="1200.00" />
                              <CostItemRow label="Hausmeister (Fremdfirma)" defaultActive={true} defaultKey="Wohnfläche (m²)" defaultAmount="1500.00" />
                              <CostItemRow label="Wartung RWM" defaultActive={true} defaultKey="Wohnfläche (m²)" defaultAmount="250.00" />
                            </tbody>
                          </table>
                        </div>

                        {/* II. Umlagefähige warme Betriebskosten */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                            II. Umlagefähige warme Betriebskosten
                          </h4>
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                              <tr>
                                <th className="p-2.5 w-10 text-center">Aktiv</th>
                                <th className="p-2.5">Kostenart</th>
                                <th className="p-2.5">Verteilerschlüssel</th>
                                <th className="p-2.5 text-right">Gesamtkosten (€)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e7ebf2] text-xs">
                              <CostItemRow label="Heizkosten gemäß Fremdabrechner" defaultActive={true} defaultKey="Verbrauch / m²" defaultAmount="2450.00" />
                              <CostItemRow label="Warmwasser gemäß Fremdabrechner" defaultActive={true} defaultKey="Verbrauch / m²" defaultAmount="820.00" />
                            </tbody>
                          </table>
                        </div>

                        {/* III. Nicht umlagefähige Positionen (NUR Vermieteransicht) */}
                        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                          <div className="flex items-center justify-between mb-3 border-b border-amber-200 pb-2">
                            <h4 className="text-sm font-bold text-amber-900">
                              🔒 Nicht umlagefähige Positionen (Nur für Vermieter / Dashboard sichtbar)
                            </h4>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold uppercase">Vermieter-Ansicht</span>
                          </div>
                          <table className="w-full text-left text-sm">
                            <thead className="bg-amber-100/50 text-xs text-amber-900">
                              <tr>
                                <th className="p-2.5 w-10 text-center">Aktiv</th>
                                <th className="p-2.5">Kostenart</th>
                                <th className="p-2.5">Verteilerschlüssel</th>
                                <th className="p-2.5 text-right">Gesamtkosten (€)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-200 text-xs">
                              <CostItemRow label="Rauchwarnmelder Miete" defaultActive={true} defaultKey="Anteile (1000stel)" defaultAmount="120.00" />
                              <CostItemRow label="Reparaturen" defaultActive={true} defaultKey="Anteile (1000stel)" defaultAmount="450.00" />
                              <CostItemRow label="Kontoführungskosten (Giro)" defaultActive={true} defaultKey="Anteile (1000stel)" defaultAmount="85.00" />
                              <CostItemRow label="Kosten Direktordnung" defaultActive={false} defaultKey="Anteile (1000stel)" defaultAmount="0.00" />
                              <CostItemRow label="Verwalterentgelt" defaultActive={true} defaultKey="Anteile (1000stel)" defaultAmount="960.00" />
                              <CostItemRow label="Verwalterentgelt (gem. Vereinb.)" defaultActive={false} defaultKey="Anteile (1000stel)" defaultAmount="0.00" />
                            </tbody>
                          </table>
                        </div>

                        {/* IV. Bewirtschaftung (Erträge) */}
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-2 mb-3">
                            III. Bewirtschaftung (Erträge) – Automatische Guthaben-Ausweisung
                          </h4>
                          <p className="text-xs text-gray-500 mb-2">
                            Kein manuelles Auswahlfeld. Erträge/Gutschriften werden automatisch erfasst, falls Einheiten Nebenkosten-Guthaben aufweisen.
                          </p>
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500">
                              <tr>
                                <th className="p-2.5">Ertragsart / Ausweis</th>
                                <th className="p-2.5 text-right">Betrag (€)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e7ebf2] text-xs">
                              <tr>
                                <td className="p-2.5 font-medium text-gray-700">Umlagefähige kalte Betriebskosten (Gutschriften / Rückzahlungen)</td>
                                <td className="p-2.5 text-right font-semibold text-green-600">0,00 € (Auto)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* V. Rücklage (NUR Vermieteransicht) */}
                        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                          <div className="flex items-center justify-between mb-3 border-b border-blue-200 pb-2">
                            <h4 className="text-sm font-bold text-blue-900">
                              🔒 IV. Rücklage – Zuführung lt. WP / Beschluss (Nur für Vermieter)
                            </h4>
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold uppercase">Vermieter-Ansicht</span>
                          </div>
                          <table className="w-full text-left text-sm">
                            <thead className="bg-blue-100/50 text-xs text-blue-900">
                              <tr>
                                <th className="p-2.5 w-10 text-center">Aktiv</th>
                                <th className="p-2.5">Beschreibung / Rücklagen-Schlüssel</th>
                                <th className="p-2.5 text-right">Zuführung zum 31.12.{bkYear} (€)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-200 text-xs">
                              <CostItemRow label="Soll Rücklage (Zuführung lt. Wirtschaftsplan)" defaultActive={true} defaultKey="Anteile (1000stel)" defaultAmount="1200.00" />
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                        <button
                          onClick={() => alert("Abrechnung als Entwurf gespeichert!")}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          Entwurf speichern
                        </button>
                        <button
                          onClick={() => alert("Abrechnung für alle Mieter im Gebäude berechnet und freigegeben!")}
                          className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                        >
                          Abrechnung erstellen & berechnen 🚀
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* UNTERMENÜ 2: BELEGE & KI-UPLOAD */}
                {bkSubTab === "belege" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-gray-800">Eingereichte Rechnungen & Belege</h3>
                      <button
                        onClick={() => setShowAddOperatingCostModal(true)}
                        className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
                      >
                        + Beleg hochladen / erfassen
                      </button>
                    </div>

                    <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center shadow-sm">
                      <div className="text-3xl mb-2">📂</div>
                      <h4 className="text-sm font-bold text-gray-800">Keine Belege für diesen Zeitraum hinterlegt</h4>
                      <p className="text-xs text-gray-500 mt-1">Nutzen Sie den KI-Upload im Dialog, um Rechnungen vollautomatisch einlesen zu lassen.</p>
                      <button
                        onClick={() => setShowAddOperatingCostModal(true)}
                        className="mt-4 rounded-lg border border-blue-600 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                      >
                        Ersten Beleg hochladen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ANDERE SEITEN PLATZHALTER */}
            {["Dokumente", "Termine & Aufgaben", "Schäden & Vorgänge", "Dienstleister", "Berichte", "Einstellungen"].includes(activePage) && (
              <div className="rounded-xl border border-[#e7ebf2] bg-white p-12 text-center text-gray-500">
                Bereich &quot;{activePage}&quot; wird als Nächstes ausgebaut.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL: BELEG / RECHNUNG ERFASSEN (MIT KI-UPLOAD) */}
      {showAddOperatingCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Beleg / Rechnung erfassen</h3>
              <button onClick={() => setShowAddOperatingCostModal(false)} className="text-xl font-bold text-gray-400 hover:text-gray-600">&times;</button>
            </div>

            {/* KI-Rechnungs-Assistent */}
            <div className="mb-6 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div>
                <span className="block text-sm font-semibold text-blue-900">🤖 KI-Rechnungs-Assistent</span>
                <span className="text-xs text-blue-700">Rechnung per PDF/Foto hochladen und automatisch auslesen lassen</span>
              </div>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="cursor-pointer text-xs text-blue-800 file:mr-2 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700"
                onChange={() => alert("KI-Scanner liest Rechnung ein (Platzhalter)")}
              />
            </div>

            <form onSubmit={handleCreateOperatingCost} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Immobilie / Objekt</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    value={newOperatingCost.property_id}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, property_id: e.target.value })}
                    required
                  >
                    <option value="">Objekt wählen</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Wohneinheit</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    value={newOperatingCost.unit_id}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, unit_id: e.target.value })}
                  >
                    <option value="">Ganzes Gebäude (Allgemeinkosten)</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>{u.unit_number} ({u.properties?.name})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Kostenkategorie</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    value={newOperatingCost.kategorie}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, kategorie: e.target.value })}
                  >
                    <option value="Abfallentsorgung">Abfallentsorgung</option>
                    <option value="Heizkosten gemäß Fremdabrechner">Heizkosten gemäß Fremdabrechner</option>
                    <option value="Reparaturen (Nicht umlagefähig)">Reparaturen (Nicht umlagefähig)</option>
                    <option value="Verwalterentgelt">Verwalterentgelt</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Betrag (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    value={newOperatingCost.betrag}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, betrag: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Rechnungsdatum</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    value={newOperatingCost.rechnungsdatum}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, rechnungsdatum: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Zeitraum Von</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    value={newOperatingCost.zeitraum_von}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, zeitraum_von: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Zeitraum Bis</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    value={newOperatingCost.zeitraum_bis}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, zeitraum_bis: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={newOperatingCost.ist_zwischenabrechnung}
                    onChange={(e) => setNewOperatingCost({ ...newOperatingCost, ist_zwischenabrechnung: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-gray-700">Unterjährige Zwischenabrechnung bei Mieterwechsel berücksichtigen</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddOperatingCostModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Beleg speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CostItemRow({ label, defaultActive, defaultKey, defaultAmount }: { label: string; defaultActive: boolean; defaultKey: string; defaultAmount: string }) {
  const [active, setActive] = useState(defaultActive);
  const [keyType, setKeyType] = useState(defaultKey);
  const [amount, setAmount] = useState(defaultAmount);

  return (
    <tr className="hover:bg-gray-50">
      <td className="p-2.5 text-center">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </td>
      <td className={`p-2.5 font-medium ${!active ? "text-gray-400 line-through" : "text-gray-800"}`}>
        {label}
      </td>
      <td className="p-2.5">
        <select
          value={keyType}
          onChange={(e) => setKeyType(e.target.value)}
          disabled={!active}
          className="rounded border border-gray-200 p-1 text-xs bg-gray-50 disabled:opacity-50"
        >
          <option value="Wohnfläche (m²)">Wohnfläche (m²)</option>
          <option value="Anteile (1000stel)">Anteile (1000stel)</option>
          <option value="Personen / Einheiten">Personen / Einheiten</option>
          <option value="Verbrauch / m²">Verbrauch / m²</option>
          <option value="Wasserzähler (m³)">Wasserzähler (m³)</option>
        </select>
      </td>
      <td className="p-2.5 text-right">
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={!active}
          className="w-28 rounded border border-gray-200 p-1 text-right text-xs bg-gray-50 disabled:opacity-50 font-semibold"
        />
      </td>
    </tr>
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