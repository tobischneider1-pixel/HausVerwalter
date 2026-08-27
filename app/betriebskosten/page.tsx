'use client';

import React, { useState } from 'react';

// Beispiel-Daten für Gebäude
const initialBuildings = [
  { id: '1044', name: 'Objekt 1044 (Mainzer Str. 36, Koblenz)', unitsCount: 23 },
  // Hier können später weitere Gebäude per Supabase geladen werden
];

// Vordefinierte Kategorien nach deiner Abrechnung
const categories = [
  { key: 'cold', label: 'Umlagefähige kalte Betriebskosten' },
  { key: 'warm', label: 'Umlagefähige warme Betriebskosten' },
  { key: 'non_recoverable', label: 'Nicht umlagefähige Positionen' },
  { key: 'reserve', label: 'Rücklage' },
];

export default function BetriebskostenPage() {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'total' | 'unit'>('total');
  const [selectedUnit, setSelectedUnit] = useState<string>('1');

  // Dynamische Kostenpositionen state
  const [expenses, setExpenses] = useState([
    { id: 1, category: 'cold', name: 'Abfallentsorgung', total: 1310.40, keyType: 'MEA', factor: '113,84 / 1.000' },
    { id: 2, category: 'cold', name: 'Gartenpflege (Fremdfirma)', total: 204.68, keyType: 'MEA', factor: '113,84 / 1.000' },
    { id: 3, category: 'warm', name: 'Heizkosten gemäß Fremdabrechner', total: 12293.57, keyType: 'Direkt/Verbrauch', factor: '-' },
    { id: 4, category: 'non_recoverable', name: 'Verwalterentgelt', total: 3927.00, keyType: 'Einheiten', factor: '1 / 23' },
    { id: 5, category: 'reserve', name: 'Zuführung Rücklage', total: 3500.04, keyType: 'MEA', factor: '113,84 / 1.000' },
  ]);

  // Modal / Eingabe für neue Position
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('cold');
  const [newName, setNewName] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [newKeyType, setNewKeyType] = useState('MEA');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTotal) return;

    setExpenses([
      ...expenses,
      {
        id: Date.now(),
        category: activeCategory,
        name: newName,
        total: parseFloat(newTotal) || 0,
        keyType: newKeyType,
        factor: 'Individuell',
      },
    ]);

    setNewName('');
    setNewTotal('');
    setShowAddModal(false);
  };

  // Wenn kein Gebäude ausgewählt ist -> Zeige Gebäude-Tabelle
  if (!selectedBuilding) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Betriebskosten & Abrechnungen</h1>
        <p className="text-gray-600 mb-6">Wähle ein Gebäude aus, um die Kostenstruktur und Einzelabrechnungen einzusehen.</p>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Objekt-ID / Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Anzahl Einheiten</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktion</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {initialBuildings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedBuilding(b.id)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{b.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.unitsCount} Einheiten</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded">Öffnen</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Detailansicht für das ausgewählte Gebäude
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button 
            onClick={() => setSelectedBuilding(null)} 
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Zurück zur Gebäudeübersicht
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Objekt 1044: Betriebskostenabrechnung 2025</h1>
        </div>

        {/* Ansichts-Umschalter: Gesamt vs. Einheit */}
        <div className="flex bg-gray-100 p-1 rounded-lg border">
          <button 
            onClick={() => setViewMode('total')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'total' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
          >
            Gesamtkosten (Haus)
          </button>
          <button 
            onClick={() => setViewMode('unit')} 
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${viewMode === 'unit' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
          >
            Nach Einheit
          </button>
        </div>
      </div>

      {/* Falls Ansicht "Nach Einheit" gewählt ist */}
      {viewMode === 'unit' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
          <div>
            <span className="font-semibold text-blue-900 mr-3">Einheit wählen:</span>
            <select 
              value={selectedUnit} 
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 bg-white text-gray-700"
            >
              <option value="1">WE 01 (KG Straßenseite - Tobias Schneider)</option>
              <option value="2">WE 02 (Beispiel-Wohnung)</option>
            </select>
          </div>
          <div className="text-sm text-blue-800">
            Schlüssel für WE 01: <strong>MEA 113,84 / 1.000</strong>
          </div>
        </div>
      )}

      {/* Kategorien und Tabellen */}
      {categories.map((cat) => {
        const catExpenses = expenses.filter(e => e.category === cat.key);
        
        return (
          <div key={cat.key} className="mb-8 bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-lg">{cat.label}</h3>
              <button 
                onClick={() => { setActiveCategory(cat.key); setShowAddModal(true); }}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition flex items-center gap-1"
              >
                + Position hinzufügen
              </button>
            </div>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Kostenart / Position</th>
                  <th className="px-6 py-3 text-left">Umlageverfahren</th>
                  <th className="px-6 py-3 text-right">
                    {viewMode === 'total' ? 'Gesamtbetrag' : 'Ihr Einzelanteil'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {catExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-400 italic">Keine Positionen in dieser Kategorie.</td>
                  </tr>
                ) : (
                  catExpenses.map((item) => {
                    // Berechnung für Ansicht (Beispiel-Logik für Einzelanteil bei MEA ca. 11.38%)
                    const displayValue = viewMode === 'total' 
                      ? item.total.toFixed(2) + ' €' 
                      : (item.total * 0.11384).toFixed(2) + ' €';

                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs font-semibold">{item.keyType}</span>
                          <span className="ml-2 text-xs text-gray-400">({item.factor})</span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-800">{displayValue}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })}

      {/* Modal zum Hinzufügen einer Position */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Neue Position hinzufügen</h3>
            <form onSubmit={handleAddExpense}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bezeichnung (Freitext oder Auswahl)</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="z.B. Schornsteinfeger, Winterdienst..." 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Gesamtbetrag (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={newTotal} 
                  onChange={(e) => setNewTotal(e.target.value)}
                  placeholder="0.00" 
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Umlageschlüssel</label>
                <select 
                  value={newKeyType} 
                  onChange={(e) => setNewKeyType(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="MEA">Nach Miteigentumsanteilen (MEA)</option>
                  <option value="Einheiten">Nach Anzahl Einheiten / Stück</option>
                  <option value="Direkt/Verbrauch">Direktzuordnung / Verbrauch</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
                >
                  Hinzufügen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}