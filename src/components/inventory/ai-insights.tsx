
"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, Loader2, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateInventoryDiscrepancyInsights } from '@/ai/flows/generate-inventory-discrepancy-insights';

interface AiInsightsProps {
  analysisData: {
    totalDiscrepancy: number;
    categoryData: { name: string; value: number }[];
    centerData: { name: string; value: number }[];
    sortedData: any[];
  };
}

export function AiInsights({ analysisData }: AiInsightsProps) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchInsights = useCallback(async () => {
    if (!analysisData.sortedData || !analysisData.sortedData.length) return;
    
    setLoading(true);
    setError(null);
    try {
      const totalDisp = analysisData.totalDiscrepancy || 0;
      const absTotalDisp = Math.abs(totalDisp);
      
      const summaryText = `Impacto neto financiero consolidado: $${totalDisp.toLocaleString()}. Análisis por categorías: Mermas, Vencimientos y Diferencias Inventario (SAP/WMS).`;
      
      const largestText = analysisData.sortedData
        .slice(0, 5)
        .map(d => `${d.productCode || 'N/A'} (${d.category || 'N/A'}): $${(d.calculatedImpact || 0).toLocaleString()}`)
        .join(', ');

      const categoryText = analysisData.categoryData
        .map(t => {
          const val = t.value || 0;
          const percentage = absTotalDisp > 0 ? ((val / absTotalDisp) * 100).toFixed(1) : "0";
          return `${t.name}: $${val.toLocaleString()} (${percentage}%)`;
        })
        .join(', ');

      const centerText = analysisData.centerData
        .map(c => `${c.name || 'Unknown'}: $${Math.abs(c.value || 0).toLocaleString()}`)
        .join(', ');

      const result = await generateInventoryDiscrepancyInsights({
        analysisSummary: summaryText,
        largestDiscrepancies: largestText,
        movementTypeBreakdown: categoryText,
        centerBreakdown: centerText,
      });

      if (result && result.insights) {
        setInsights(result.insights);
      } else {
        setInsights("No se pudieron generar recomendaciones automáticas en este momento.");
      }
    } catch (err: any) {
      console.error("AI Error:", err);
      setError("Error de comunicación. Por favor, asegúrate de que la API Key en Vercel sea correcta y realiza un 'Redeploy'.");
    } finally {
      setLoading(false);
    }
  }, [analysisData]);

  useEffect(() => {
    if (!fetchedRef.current && analysisData.sortedData?.length > 0) {
      fetchInsights();
      fetchedRef.current = true;
    }
  }, [fetchInsights, analysisData.sortedData]);

  return (
    <Card className="bg-accent/5 border-accent/20 overflow-hidden relative shadow-sm">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-16 h-16 text-accent" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline flex items-center justify-between text-accent">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Análisis Estratégico Consolidado (IA)
          </div>
          {(error || (!loading && insights)) && (
            <Button variant="ghost" size="sm" onClick={() => fetchInsights()} className="h-8 gap-1 text-xs hover:bg-accent/10">
              <RefreshCw className="w-3 h-3" /> Reintentar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-3 py-6 text-muted-foreground italic animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-accent" />
            Consolidando patrones de mermas, vencimientos y diferencias técnicas...
          </div>
        ) : error ? (
          <div className="flex flex-col gap-3 p-4 bg-destructive/5 border border-destructive/20 rounded-lg text-destructive text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              Problema de conexión con la IA
            </div>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap bg-white/50 p-4 rounded-lg border border-accent/10">
              {insights || "Esperando datos de análisis..."}
            </div>
            {!loading && insights && (
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground/60 uppercase font-bold border-t pt-2">
                <Info className="w-3 h-3" />
                Nota: Análisis optimizado para iFrame. Impacto neto agrupado (Z59+Z60+Z65+Z66).
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
