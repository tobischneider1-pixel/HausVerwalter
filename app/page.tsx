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

  // Modals
  const [showAddPropModal, setShowAddPropModal] = useState(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

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

  const [editPaymentForm, setEditPaymentForm] = useState({
    tenant_id: "",
    amount: "",
    payment_date: "",
    due_date: "",
    type: "Miete",
    status: "pünktlich",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const { data: propsData } = await supabase.from("properties").select("*");
    if (propsData) setProperties(propsData);

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

  function openEditPayment(payment: Payment) {
    setEditingPayment(payment);
    setEditPaymentForm({
      tenant_id: payment.tenant_id,
      amount: String(payment.amount),
      payment_date: payment.payment_date,
      due_date: payment.due_date,
      type: payment.type,
      status: payment.status,
      notes: payment.notes || "",
    });
  }

  async function handleUpdatePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPayment) return;

    const { error } = await supabase
      .from("payments")
      .update({
        tenant_id: editPaymentForm.tenant_id,
        amount: Number(editPaymentForm.amount),
        payment_date: editPaymentForm.payment_date,
        due_date: editPaymentForm.due_date,
        type: editPaymentForm.type,
        status: editPaymentForm.status,
        notes: editPaymentForm.notes,
      })
      .eq("id", editingPayment.id);

    if (!error) {
      setEditingPayment(null);
      fetchData();
    } else alert("Fehler beim Bearbeiten der Zahlung: " + error.message);
  }

  async function handleDeletePayment(id: string) {
    if (!confirm("Möchtest du diese Zahlung wirklich löschen?")) return;
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (!error) fetchData();
    else alert("Fehler beim Löschen: " + error.message);
  }

  const formatEuro = (val: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(val);

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString("de-DE") : "-");

  const calculatedNewWarm =
    (Number(newTenant.rent_amount) || 0) + (Number(newTenant.utility_advance) || 0);

  const calculatedEditWarm =
    (Number(editTenantForm.rent_amount) || 0) + (Number(editTenantForm.utility_advance) || 0);

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

  const filteredPaymentsTotal = filteredPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );

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
                          Ausstehend:{" "}
                          {unpaidTenantsList.map((t) => `${t.first_name} ${t.last_name}`).join(", ")}
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

                {/* FILTER-BAR */}
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
                          <th className="p-4 text-right">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e7ebf2]">
                        {filteredPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="p-4 font-semibold">
                              {p.tenants ? `${p.tenants.first_name} ${p.tenants.last_name}` : "Unbekannt"}
                            </td>
                            <td className="p-4 text-gray-600">{p.type}</td>
                            <td className="p-4 text-gray-600">{formatDate(p.payment_date)}</td>
                            <td className="p-4 text-gray-600">{formatDate(p.due_date)}</td>
                            <td className="p-4 font-bold text-gray-800">{formatEuro(p.amount)}</td>
                            <td className="p-4">
                              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                p.status === "pünktlich" ? "bg-green-100 text-green-700" :
                                p.status === "unvollständig" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-gray-500">{p.notes || "-"}</td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => openEditPayment(p)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* BETRIEBSKOSTEN */}
            {activePage === "Betriebskosten" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[21px] font-bold">Betriebskosten</h2>
                    <p className="text-sm text-gray-500">Verwalten Sie hier die Betriebskosten und Abrechnungen.</p>
                  </div>
                  <button
                    onClick={() => alert("Modal für Betriebskosten öffnen")}
                    className="rounded-lg bg-[#2f6fd0] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    + Betriebskosten erfassen
                  </button>
                </div>

                <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center">
                  <h3 className="text-lg font-bold">Betriebskosten-Übersicht</h3>
                  <p className="mt-2 text-sm text-gray-500">Hier entsteht deine Ansicht für die Betriebskosten.</p>
                </div>
              </div>
            )}

            {/* PLATZHALTER FÜR ALLE ANDEREN SEITEN */}
            {activePage !== "Überblick" && 
             activePage !== "Objekte" && 
             activePage !== "Einheiten" && 
             activePage !== "Mieter" && 
             activePage !== "Verträge" && 
             activePage !== "Zahlungen" && 
             activePage !== "Betriebskosten" && (
              <div className="rounded-xl border border-[#e7ebf2] bg-white p-10 text-center">
                <h2 className="text-xl font-bold">{activePage}</h2>
                <p className="mt-2 text-sm text-gray-500">Dieser Bereich wird als Nächstes ausgebaut.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODALS (Objekt, Einheit, Mieter, Zahlungen etc.) können hier bei Bedarf ergänzt werden */}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, iconClass, green }: { title: string; value: string; subtitle: string; icon: string; iconClass: string; green?: boolean }) {
  return (
    <div className="rounded-xl border border-[#e7ebf2] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500">{title}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${iconClass}`}>
          {icon}
        </div>
      </div>
      <div className={`mt-3 text-2xl font-bold ${green ? "text-green-600" : "text-[#1d2939]"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}