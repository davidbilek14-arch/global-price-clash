import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- TVÉ SUPABASE PŘIPOJENÍ ---
const SUPABASE_URL = 'https://yzoiyyhvsdqqoibrocgg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6b2l5eWh2c2RxcW9pYnJvY2dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MzA5OTgsImV4cCI6MjEwMDQwNjk5OH0.qCqEUslQwKxvSPAEO_70aLZrjSGJQl7AD_7hyCukL40';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// TypeScript rozhraní pro kartu
interface Question {
  id: number;
  item_a_name: string;
  item_a_location: string;
  item_a_price: number;
  item_b_name: string;
  item_b_location: string;
  item_b_price: number;
  fun_fact: string;
}

export default function App() {
  const [vsechnyKarty, setVsechnyKarty] = useState<Question[]>([]);
  const [dostupneKarty, setDostupneKarty] = useState<Question[]>([]);
  const [aktualniKarta, setAktualniKarta] = useState<Question | null>(null);
  const [skore, setSkore] = useState<number>(0);
  const [zobrazitVysledek, setZobrazitVysledek] = useState<boolean>(false);
  const [zprava, setZprava] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 1. Načtení dat při startu aplikace
  useEffect(() => {
    async function inicializujHru() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('questions_endless')
        .select('*');

      if (error) {
        console.error('Chyba při stahování karet:', error);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setVsechnyKarty(data);

        // Načteme historii z localStorage
        const videneIdCka = JSON.parse(localStorage.getItem('hrac_videne_karty') || '[]');
        
        // Zafiltrujeme neviděné
        const nevidene = data.filter((karta) => !videneIdCka.includes(karta.id));

        if (nevidene.length === 0) {
          // Pokud prošel vše, resetujeme paměť
          localStorage.removeItem('hrac_videne_karty');
          setDostupneKarty(data);
          vyberDalsiKartu(data);
        } else {
          setDostupneKarty(nevidene);
          vyberDalsiKartu(nevidene);
        }
      }
      setIsLoading(false);
    }

    inicializujHru();
  }, []);

  // 2. Funkce pro losování další neviděné karty
  const vyberDalsiKartu = (seznamDostupnych?: Question[]) => {
    let pool = seznamDostupnych !== undefined ? seznamDostupnych : [...dostupneKarty];
    let kompletniPool = [...vsechnyKarty];

    if (pool.length === 0) {
      localStorage.removeItem('hrac_videne_karty');
      pool = kompletniPool;
    }

    const nahodnyIndex = Math.floor(Math.random() * pool.length);
    const vybrana = pool[nahodnyIndex];

    // Odstraníme z aktuálního poolu v paměti
    pool.splice(nahodnyIndex, 1);
    setDostupneKarty(pool);

    // Uložíme do localStorage jako viděnou
    const videneIdCka = JSON.parse(localStorage.getItem('hrac_videne_karty') || '[]');
    if (!videneIdCka.includes(vybrana.id)) {
      videneIdCka.push(vybrana.id);
      localStorage.setItem('hrac_videne_karty', JSON.stringify(videneIdCka));
    }

    setAktualniKarta(vybrana);
    setZobrazitVysledek(false);
    setZprava('');
  };

  // 3. Vyhodnocení tipu uživatele (Vyšší / Nižší)
  const tipovat = (tip: 'higher' | 'lower') => {
    if (!aktualniKarta) return;

    const cenaA = aktualniKarta.item_a_price;
    const cenaB = aktualniKarta.item_b_price;

    let vyhra = false;
    if (tip === 'higher' && cenaB >= cenaA) {
      vyhra = true;
    } else if (tip === 'lower' && cenaB <= cenaA) {
      vyhra = true;
    }

    setZobrazitVysledek(true);

    if (vyhra) {
      setSkore(skore + 1);
      setZprava('Správně! 🎉');
    } else {
      setZprava('Chyba! Konec hry ❌');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
        <h2>Načítám bizarní otázky ze Supabase...</h2>
      </div>
    );
  }

  if (!aktualniKarta) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
        <h2>Žádné karty nejsou k dispozici.</h2>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      
      {/* Hlavička a skóre */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 10px 0' }}>Bizarre Higher / Lower</h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8' }}>Skóre: <strong style={{ color: '#38bdf8' }}>{skore}</strong></p>
      </div>

      {/* Herní karty */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px', width: '100%' }}>
        
        {/* Karta A (Fixní) */}
        <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: '16px', padding: '30px', width: '350px', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}>
          <span style={{ background: '#3b82f6', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>POLOŽKA A</span>
          <h2 style={{ fontSize: '1.5rem', margin: '20px 0 10px 0' }}>{aktualniKarta.item_a_name}</h2>
          <p style={{ color: '#94a3b8', margin: '0 0 20px 0' }}>📍 {aktualniKarta.item_a_location}</p>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#38bdf8' }}>
            ${aktualniKarta.item_a_price.toLocaleString()}
          </div>
        </div>

        {/* Karta B (Hodnotu hádáme) */}
        <div style={{ background: '#1e293b', border: '2px solid #334155', borderRadius: '16px', padding: '30px', width: '350px', textAlign: 'center', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ background: '#ec4899', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>POLOŽKA B</span>
            <h2 style={{ fontSize: '1.5rem', margin: '20px 0 10px 0' }}>{aktualniKarta.item_b_name}</h2>
            <p style={{ color: '#94a3b8', margin: '0 0 20px 0' }}>📍 {aktualniKarta.item_b_location}</p>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f43f5e', margin: '15px 0' }}>
              {zobrazitVysledek ? `$${aktualniKarta.item_b_price.toLocaleString()}` : '???'}
            </div>
          </div>

          {/* Tlačítka nebo výsledek */}
          {!zobrazitVysledek ? (
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button 
                onClick={() => tipovat('higher')}
                style={{ flex: 1, background: '#22c55e', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Vyšší 📈
              </button>
              <button 
                onClick={() => tipovat('lower')}
                style={{ flex: 1, background: '#eab308', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Nižší 📉
              </button>
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>{zprava}</p>
              <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#cbd5e1', margin: '0 0 15px 0' }}>💡 {aktualniKarta.fun_fact}</p>
              <button 
                onClick={() => {
                  if (zprava.includes('Konec hry')) {
                    setSkore(0);
                  }
                  vyberDalsiKartu();
                }}
                style={{ width: '100%', background: '#3b82f6', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                Další karta ➡️
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
