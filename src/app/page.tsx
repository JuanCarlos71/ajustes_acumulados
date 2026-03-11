"use client"

import React, { useState } from 'react';
import { Boxes, Info } from 'lucide-react';
import { InventoryUploader } from '@/components/inventory/uploader';
import { InventoryDashboard } from '@/components/inventory/dashboard';
import { performAnalysis, AnalysisResult } from '@/lib/inventory-logic';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function InventoryInsightsPage() {
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[] | null>(null);

  const handleDataReady = (movements: any[], valuations: any[]) => {
    const results = performAnalysis(movements, valuations);
    setAnalysisResults(results);
  };

  const ColorfulCredit = () => {
    const text = "Creado por jugonza@ccu.cl";
    const colors = [
      'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 
      'text-blue-500', 'text-indigo-500', 'text-purple-500', 'text-pink-500'
    ];
    return (
      <>
        {text.split('').map((char, i) => (
          <span key={i} className={char === ' ' ? '' : colors[i % colors.length]}>
            {char}
          </span>
        ))}
      </>
    );
  };

  return (
    <main className="container mx-auto px-4 py-8 md:py-16">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <Boxes className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-primary">
            Analizador de <span className="text-accent">Insights</span> de Inventario
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-body">
            Sube tus reportes de ajustes de bodega y factores de valoración para descubrir discrepancias, identificar patrones y obtener recomendaciones logísticas.
          </p>
        </header>

        {!analysisResults ? (
          <div className="space-y-8">
            <InventoryUploader onDataReady={handleDataReady} />
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <h2 className="text-2xl font-headline font-bold text-primary">Resultados del Análisis</h2>
              <button 
                onClick={() => setAnalysisResults(null)}
                className="text-sm font-medium text-accent hover:underline flex items-center gap-1 font-body"
              >
                ← Subir Nuevos Archivos
              </button>
            </div>
            <InventoryDashboard data={analysisResults} />
          </div>
        )}

        <section className="mt-20 print:hidden">
          <Alert variant="default" className="max-w-3xl mx-auto bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="font-headline font-semibold text-primary uppercase tracking-wider text-xs m-0">Instrucciones de Uso</AlertTitle>
            </div>
            <AlertDescription className="text-sm text-muted-foreground font-body mt-2">
              <ul className="list-disc list-inside space-y-3">
                <li><strong>Archivo 1 (MB51):</strong> Debe contener las columnas: 'Material', 'Clase de mov.', 'Centro', 'Ctd.en UM entrada'.</li>
                <li><strong>Archivo 2 (Factores):</strong> Debe contener las columnas: 'Material' y 'Factor' (valor unitario).</li>
                <li><strong>Procesamiento:</strong> El sistema normaliza materiales (elimina ceros iniciales) y compensa entradas (+) y salidas (-) según clase de movimiento.</li>
                <li><strong>Gráficos:</strong> Los desgloses muestran el impacto financiero real (Cantidad x Factor) por cada centro logístico.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </section>

        <footer className="text-center pt-20 border-t space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-50 font-body">
            &copy; {new Date().getFullYear()} Analizador de Insights de Inventario • Gestión de Datos de Precisión SAP/WMS
          </p>
          <p className="text-sm font-bold font-headline">
            <ColorfulCredit />
          </p>
        </footer>
      </div>
    </main>
  );
}
