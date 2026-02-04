
"use client"

import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const fetchInsights = async () => {
    if (!analysisData.sortedData.length) return;
    
    setLoading(true);
    setError(null);
    try {
      const summaryText = `Impacto neto financiero consolidado: $${analysisData.totalDiscrepancy.toLocaleString()}. Análisis por categorías: Mermas, Vencimientos y Diferencias Inventario (SAP/WMS).`;
      
      const largestText = analysisData.sortedData
        .slice(0, 5)
        .map(d => `${d.productCode} (${d.category}): $${d.calculatedImpact.toLocaleString()}`)
        .join(', ');

      const categoryText = analysisData.categoryData
        .map(t => `${t.name}: $${t.value.toLocaleString()} (${(t.value / Math.max(1, analysisData.totalDiscrepancy) * 100).toFixed(1)}%)`)
        .join(', ');

      const centerText = analysisData.centerData
        .map(c => `${c.name}: $${Math.abs(c.value).toLocaleString()}`)
        .join(', ');

      const result = await generateInventoryDiscrepancyInsights({
        analysisSummary: summaryText,
        largestDiscrepancies: largestText,
        movementTypeBreakdown: categoryText,
        centerBreakdown: centerText,
      });

      setInsights(result.insights);
    } catch (error: any) {
      console.error('Failed to generate insights:', error);
      setError("Error de conexión con la IA. Verifique que la API Key de Gemini esté configurada correctamente en el archivo .env");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [analysisData]);

  return (
    <Card className="bg-accent/5 border-accent/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="w-16 h-16 text-accent" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-headline flex items-center gap-2 text-accent">
          <Sparkles className="w-5 h-5" />
          Análisis Estratégico Consolidado (IA)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-3 py-4 text-muted-foreground italic">
            <Loader2 className="w-4 h-4 animate-spin" />
            Consolidando patrones de mermas, vencimientos y diferencias técnicas...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {insights}
            </p>
            {!loading && insights && (
              <div className="flex items-start gap-2 text-[10px] text-muted-foreground/60 uppercase font-bold border-t pt-2">
                <Info className="w-3 h-3" />
                Nota: Este análisis considera ajustes netos (Z59+Z60+Z65+Z66 agrupados).
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
