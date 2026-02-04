
"use client"

import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend
} from 'recharts';
import { 
  Download, TrendingDown, TrendingUp, Calculator, BarChart3, PackageSearch 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AnalysisResult, exportToExcel } from '@/lib/inventory-logic';
import { AiInsights } from './ai-insights';

interface DashboardProps {
  data: AnalysisResult[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Mermas': '#E11D48',
  'Vencimientos': '#F59E0B',
  'Diferencias de Inventario': '#008080',
  'Otros': '#708090'
};

export function InventoryDashboard({ data }: DashboardProps) {
  const summary = useMemo(() => {
    const totalImpact = data.reduce((acc, curr) => acc + curr.calculatedImpact, 0);
    const totalLocalAmount = data.reduce((acc, curr) => acc + curr.localAmount, 0);
    
    const byCategory = data.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.calculatedImpact;
      return acc;
    }, {} as Record<string, number>);
    
    const centers = Array.from(new Set(data.map(d => d.center)));
    const categories = ['Mermas', 'Vencimientos', 'Diferencias de Inventario'];
    
    const chartData = centers.map(center => {
      const entry: any = { center };
      categories.forEach(cat => {
        const val = data
          .filter(d => d.center === center && d.category === cat)
          .reduce((sum, d) => sum + Math.abs(d.calculatedImpact), 0);
        entry[cat] = val;
      });
      return entry;
    });

    const technicalData = data.filter(d => d.category === 'Diferencias de Inventario');

    return {
      totalImpact,
      totalLocalAmount,
      categoryData: Object.entries(byCategory).map(([name, value]) => ({ name, value: Math.abs(value) })),
      chartData,
      sortedData: data,
      technicalData
    };
  }, [data]);

  const handleDownload = () => {
    exportToExcel(summary.technicalData, 'Reporte_Diferencias_Inventario_SAP_WMS');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-80 uppercase tracking-wider">Impacto Neto Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-headline font-bold">
              ${summary.totalImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs mt-1 opacity-70">Suma consolidada (positivos y negativos)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Importe MB51 Original</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-headline font-bold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              ${summary.totalLocalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valor base antes de factor técnico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Análisis de Mermas/Vencimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-headline font-bold flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              ${((summary.categoryData.find(c => c.name === 'Mermas')?.value || 0) + (summary.categoryData.find(c => c.name === 'Vencimientos')?.value || 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Impacto financiero por pérdida de producto</p>
          </CardContent>
        </Card>
      </div>

      <AiInsights analysisData={{
        totalDiscrepancy: summary.totalImpact,
        categoryData: summary.categoryData,
        centerData: summary.chartData.map(c => ({ name: c.center, value: Object.values(c).slice(1).reduce((a: any, b: any) => a + b, 0) })),
        sortedData: summary.sortedData
      }} />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Impacto Diferenciado por Centro y Categoría
          </CardTitle>
          <CardDescription>Visualización de ajustes por Mermas, Inventario y Vencimientos por sede logítica</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="center" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip 
                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Valor Absoluto']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="Mermas" fill={CATEGORY_COLORS['Mermas']} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Diferencias de Inventario" fill={CATEGORY_COLORS['Diferencias de Inventario']} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Vencimientos" fill={CATEGORY_COLORS['Vencimientos']} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-lg flex items-center gap-2">
              <PackageSearch className="w-5 h-5 text-primary" />
              Detalle Técnico MB51 Consolidado (Sólo Diferencias)
            </CardTitle>
            <CardDescription>Exclusivo Z59, Z60, Z65 y Z66 • Agrupado por Material/Centro para impacto neto</CardDescription>
          </div>
          <Button onClick={handleDownload} className="flex gap-2">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] uppercase">
                <TableRow>
                  <TableHead className="font-headline">Material</TableHead>
                  <TableHead className="font-headline">Descripción</TableHead>
                  <TableHead className="font-headline text-right">Cantidad Consolidada</TableHead>
                  <TableHead className="font-headline">Centro</TableHead>
                  <TableHead className="font-headline text-right">Impte. Total MB51</TableHead>
                  <TableHead className="font-headline text-right bg-accent/5">Factor</TableHead>
                  <TableHead className="font-headline text-right bg-accent/10">Impacto Neto Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.technicalData.slice(0, 50).map((item, i) => (
                  <TableRow key={i} className="hover:bg-primary/5 transition-colors text-xs">
                    <TableCell className="font-bold font-headline">{item.productCode}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={item.productDescription}>
                      {item.productDescription}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-primary">
                      {item.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">{item.center}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">${item.localAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right text-accent font-medium bg-accent/5 font-mono">{item.factor.toFixed(4)}</TableCell>
                    <TableCell className="text-right font-bold bg-accent/10">
                      <div className="flex items-center justify-end gap-1 font-mono">
                        {item.calculatedImpact < 0 ? <TrendingDown className="w-3 h-3 text-red-500" /> : <TrendingUp className="w-3 h-3 text-primary" />}
                        <span className={item.calculatedImpact < 0 ? 'text-red-500' : 'text-primary'}>
                          ${item.calculatedImpact.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {summary.technicalData.length === 0 && (
              <div className="p-8 text-center text-muted-foreground italic">
                No se encontraron movimientos Z59, Z60, Z65 o Z66 en los archivos cargados.
              </div>
            )}
            {summary.technicalData.length > 50 && (
              <div className="p-4 text-center text-xs text-muted-foreground bg-muted/20 italic">
                Mostrando los 50 mayores impactos de un total de {summary.technicalData.length} registros de diferencias de inventario.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
