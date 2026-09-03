"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Property, Unit, Tenant, Payment } from "@/types";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

import OverviewTab from "@/components/tabs/OverviewTab";
import PropertiesTab from "@/components/tabs/PropertiesTab";
import UnitsTab from "@/components/tabs/UnitsTab";
import TenantsTab from "@/components/tabs/TenantsTab";
import PaymentsTab from "@/components/tabs/PaymentsTab";
import OperatingCostsTab from "@/components/tabs/OperatingCostsTab";

import AddPropertyModal from "@/components/modals/AddPropertyModal";
import AddUnitModal from "@/components/modals/AddUnitModal";
import AddTenantModal from "@/components/modals/AddTenantModal";
import AddPaymentModal from "@/components/modals/AddPaymentModal";

import ContractsTab from "@/components/tabs/ContractsTab";

export default function Page() {
  const [activeTab, setActiveTab] = useState("Überblick");

  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const { data: props } = await supabase.from("properties").select("*");
      if (props) setProperties(props);

      const { data: unts } = await supabase.from("units").select("*, properties(name)");
      if (unts) setUnits(unts);

      const { data: tnts } = await supabase.from("tenants").select("*, units(unit_number, property_id, properties(name))");
      if (tnts) setTenants(tnts);

      const { data: pyms } = await supabase.from("payments").select("*, tenants(first_name, last_name, units(unit_number))");
      if (pyms) setPayments(pyms);
    } catch (e) {
      console.error("Fehler beim Laden der Daten aus Supabase:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans antialiased">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          activeTab={activeTab}
          onOpenPropertyModal={() => setIsPropertyModalOpen(true)}
          onOpenUnitModal={() => setIsUnitModalOpen(true)}
          onOpenTenantModal={() => setIsTenantModalOpen(true)}
          onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        />

        <main className="p-6 flex-1 overflow-y-auto">
          {activeTab === "Überblick" && (
            <OverviewTab properties={properties} units={units} tenants={tenants} payments={payments} />
          )}
          {activeTab === "Objekte" && (
            <PropertiesTab properties={properties} onRefresh={fetchData} />
          )}
          {activeTab === "Einheiten" && (
            <UnitsTab units={units} properties={properties} onRefresh={fetchData} />
          )}
          {activeTab === "Mieter" && (
            <TenantsTab tenants={tenants} units={units} onRefresh={fetchData} />
          )}
          {activeTab === "Zahlungen" && (
            <PaymentsTab payments={payments} />
          )}
          {activeTab === "Betriebskosten" && (
            <OperatingCostsTab properties={properties} units={units} tenants={tenants} />
          )}
          {activeTab === "Verträge" && (
            <ContractsTab properties={properties} units={units} tenants={tenants} onRefresh={fetchData} />
          )}  
        </main>
      </div>

      <AddPropertyModal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        onSuccess={fetchData}
      />
      <AddUnitModal
        isOpen={isUnitModalOpen}
        onClose={() => setIsUnitModalOpen(false)}
        onSuccess={fetchData}
        properties={properties}
      />
      <AddTenantModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        onSuccess={fetchData}
        units={units}
      />
      <AddPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={fetchData}
        tenants={tenants}
      />
    </div>
  );
}