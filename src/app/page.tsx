
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
            Sube tus reportes de ajustes de bodega y factores de valoración para descubrir discrepancias, identificar patrones y obtener recomendaciones logísticas impulsadas por IA.
          </p>
        </header>

        {!analysisResults ? (
          <div className="space-y-8">
            <InventoryUploader onDataReady={handleDataReady} />
            <Alert variant="default" className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
              <Info className="h-4 w-4 text-primary" />
              <AlertTitle className="font-headline font-semibold text-primary">Instrucciones de Uso</AlertTitle>
              <AlertDescription className="text-sm text-muted-foreground font-body">
                <ul className="list-disc list-inside mt-2 space-y-2">
                  <li><strong>Archivo 1 (MB51):</strong> Debe contener las columnas de 'Material', 'Clase de mov.', 'Centro', 'Ctd.en UM entrada', 'Impte.mon.local' y 'Fecha contabiliz.'.</li>
                  <li><strong>Archivo 2 (Factores):</strong> Debe contener las columnas de 'Material' y 'Factor' (valor unitario de valoración).</li>
                  <li>Los resultados se priorizan automáticamente para resaltar primero los mayores impactos financieros negativos y positivos.</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-2xl font-headline font-bold text-primary">Resultados del Análisis</h2>
              <button 
                onClick={() => setAnalysisResults(null)}
                className="text-sm font-medium text-accent hover:underline flex items-center gap-1"
              >
                ← Subir Nuevos Archivos
              </button>
            </div>
            <InventoryDashboard data={analysisResults} />
          </div>
        )}

        <footer className="text-center pt-20 border-t">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-50">
            &copy; {new Date().getFullYear()} Analizador de Insights de Inventario • Gestión de Datos Logísticos de Precisión
          </p>
        </footer>
      </div>
    </main>
  );
}
