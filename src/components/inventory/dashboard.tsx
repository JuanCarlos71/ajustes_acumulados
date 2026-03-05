"use client"

import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, PieChart, Pie, Cell
} from 'recharts';
import { 
  Download, BarChart3, FileText, CalendarRange, 
  AlertCircle, Layers, Package, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { AnalysisResult, exportToExcel, MovementCategory } from '@/lib/inventory-logic';
import { cn } from '@/lib/utils';

interface DashboardProps {
  data: AnalysisResult[];
}

const CATEGORY_COLORS = {
  'Mermas': '#E11D48',
  'Diferencias de Inventario': '#008080',
  'Vencimientos': '#F59E0B'
};

const CHART_COLORS = ['#008080', '#E11D48', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F43F5E'];

const formatCurrency = (val: number) => {
  const isNeg = val < 0;
  const absVal = Math.round(Math.abs(val));
  const formatted = absVal.toLocaleString('es-CL');
  return `${isNeg ? '$-' : '$'}${formatted}`;
};

export function InventoryDashboard({ data }: DashboardProps) {
  const [colFilterMaterial, setColFilterMaterial] = useState('');
  const [colFilterDescription, setColFilterDescription] = useState('');
  const [colFilterCenter, setColFilterCenter] = useState('');
  const [matrixCenterFilter, setMatrixCenterFilter] = useState<string>('all');

  const centers = useMemo(() => 
    Array.from(new Set(data.map(d => d.center)))
      .filter(c => c && typeof c === 'string' && c.trim() !== '' && c !== 'Unknown')
      .sort(), 
  [data]);

  const summary = useMemo(() => {
    const getCategorySummary = (category: MovementCategory) => {
      const filtered = data.filter(d => d.category === category);
      const centersMap = filtered.reduce((acc, curr) => {
        if (!acc[curr.center]) {
          acc[curr.center] = { name: curr.center, impact: 0 };
        }
        acc[curr.center].impact += curr.calculatedImpact;
        return acc;
      }, {} as Record<string, { name: string, impact: number }>);

      const list = Object.values(centersMap).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
      const pieData = list.map(c => ({
        name: c.name,
        value: Math.round(Math.abs(c.impact))
      }));

      return { list, pieData, total: list.reduce((a, b) => a + b.impact, 0) };
    };

    const differences = getCategorySummary('Diferencias de Inventario');
    const mermas = getCategorySummary('Mermas');
    const vencimientos = getCategorySummary('Vencimientos');

    const totalImpact = differences.total + mermas.total + vencimientos.total;

    const stackedData = centers.map(center => {
      const centerMovements = data.filter(d => d.center === center);
      return {
        center,
        'Mermas': centerMovements.filter(d => d.category === 'Mermas').reduce((acc, curr) => acc + curr.calculatedImpact, 0),
        'Diferencias de Inventario': centerMovements.filter(d => d.category === 'Diferencias de Inventario').reduce((acc, curr) => acc + curr.calculatedImpact, 0),
        'Vencimientos': centerMovements.filter(d => d.category === 'Vencimientos').reduce((acc, curr) => acc + curr.calculatedImpact, 0),
      };
    }).sort((a, b) => {
      const impactA = Math.abs(a['Mermas'] + a['Diferencias de Inventario'] + a['Vencimientos']);
      const impactB = Math.abs(b['Mermas'] + b['Diferencias de Inventario'] + b['Vencimientos']);
      return impactB - impactA;
    });

    const matrixRowsFiltered = data.filter(d => {
      const isDiff = d.category === 'Diferencias de Inventario';
      const matchCenter = matrixCenterFilter === 'all' || d.center === matrixCenterFilter;
      return isDiff && matchCenter;
    });

    const dailyMatrix: Record<string, Record<number, number>> = {};
    const materialsInfo: Record<string, string> = {};
    const daysFound = new Set<number>();
    const materialNetImpactMap: Record<string, number> = {};
    const materialQtyMap: Record<string, number> = {};

    matrixRowsFiltered.forEach(d => {
      if (d.day === undefined) return;
      daysFound.add(d.day);
      if (!dailyMatrix[d.productCode]) {
        dailyMatrix[d.productCode] = {};
        materialsInfo[d.productCode] = d.productDescription;
        materialNetImpactMap[d.productCode] = 0;
        materialQtyMap[d.productCode] = 0;
      }
      dailyMatrix[d.productCode][d.day] = (dailyMatrix[d.productCode][d.day] || 0) + d.quantity;
      materialNetImpactMap[d.productCode] += d.calculatedImpact;
      materialQtyMap[d.productCode] += d.quantity;
    });

    const topPositive = Object.entries(materialNetImpactMap)
      .filter(([_, impact]) => impact > 0)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([code]) => code);

    const topNegative = Object.entries(materialNetImpactMap)
      .filter(([_, impact]) => impact < 0)
      .sort((a, b) => a[1] - b[1]).slice(0, 5).map(([code]) => code);

    const topCodes = [...topPositive, ...topNegative];
    const matrixRows = topCodes.map(code => ({
      code,
      description: materialsInfo[code],
      days: dailyMatrix[code],
      totalQty: materialQtyMap[code] || 0,
      netImpact: materialNetImpactMap[code] || 0
    }));

    // Consolidación técnica (agrupar Material + Centro)
    const technicalMap: Record<string, AnalysisResult> = {};
    data.forEach(d => {
      const key = `${d.productCode}-${d.center}`;
      if (!technicalMap[key]) {
        technicalMap[key] = { ...d };
      } else {
        technicalMap[key].quantity += d.quantity;
        technicalMap[key].calculatedImpact += d.calculatedImpact;
        technicalMap[key].localAmount += d.localAmount;
      }
    });

    const filteredTechnical = Object.values(technicalMap)
      .filter(d => {
        const matchMaterial = (d.productCode || '').toLowerCase().includes(colFilterMaterial.toLowerCase());
        const matchDescription = (d.productDescription || '').toLowerCase().includes(colFilterDescription.toLowerCase());
        const matchCenter = (d.center || '').toLowerCase().includes(colFilterCenter.toLowerCase());
        return matchMaterial && matchDescription && matchCenter;
      })
      .sort((a, b) => Math.abs(b.calculatedImpact) - Math.abs(a.calculatedImpact));

    return {
      totalImpact,
      differences,
      mermas,
      vencimientos,
      stackedData,
      matrixRows,
      sortedDays: Array.from(daysFound).sort((a, b) => a - b),
      filteredTechnical
    };
  }, [data, centers, colFilterMaterial, colFilterDescription, colFilterCenter, matrixCenterFilter]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3 justify-end print:hidden">
        <Button onClick={() => window.print()} variant="outline" className="border-primary text-primary">
          <FileText className="w-4 h-4 mr-2" /> Descargar PDF
        </Button>
        <Button onClick={() => exportToExcel(summary.filteredTechnical, 'Reporte_Inventario')}>
          <Download className="w-4 h-4 mr-2" /> Exportar Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary text-primary-foreground shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold opacity-80">Impacto Neto Total</p>
            <div className="text-2xl font-bold mt-1">{formatCurrency(summary.totalImpact)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Mermas (Z42/Z43)</p>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(summary.mermas.total)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Vencimientos (Z44/Z45)</p>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(summary.vencimientos.total)}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-500 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-xs uppercase font-bold text-muted-foreground">Diferencias (Z59-Z66)</p>
            <div className="text-2xl font-bold text-teal-600">{formatCurrency(summary.differences.total)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <BarChart3 className="w-5 h-5" /> Visión Comparativa Consolidada por Centro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.stackedData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="center" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => `$${(v/1e6).toFixed(0)}M`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend verticalAlign="top" iconType="rect" />
                <Bar dataKey="Mermas" stackId="a" fill={CATEGORY_COLORS['Mermas']} />
                <Bar dataKey="Diferencias de Inventario" stackId="a" fill={CATEGORY_COLORS['Diferencias de Inventario']} />
                <Bar dataKey="Vencimientos" stackId="a" fill={CATEGORY_COLORS['Vencimientos']} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-12">
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Layers className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-teal-700 uppercase tracking-wider text-sm">Diferencias de inventario por Centro</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold py-3 uppercase">CENTRO</TableHead>
                    <TableHead className="text-right text-[10px] font-bold min-w-[140px] uppercase">IMP. NETO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.differences.list.map((c, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-bold py-3">{c.name}</TableCell>
                      <TableCell className={cn("text-right py-3 font-mono font-bold", c.impact < 0 ? 'text-red-500' : 'text-teal-600')}>
                        {formatCurrency(c.impact)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.differences.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                    {summary.differences.pieData.map((e, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-rose-700 uppercase tracking-wider text-sm">Mermas por Centro (Z42/Z43)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold py-3 uppercase">CENTRO</TableHead>
                    <TableHead className="text-right text-[10px] font-bold min-w-[140px] uppercase">IMP. NETO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.mermas.list.map((c, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-bold py-3">{c.name}</TableCell>
                      <TableCell className="text-right py-3 font-mono font-bold text-rose-600">
                        {formatCurrency(c.impact)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.mermas.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                    {summary.mermas.pieData.map((e, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Calendar className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-700 uppercase tracking-wider text-sm">Vencimientos por Centro (Z44/Z45)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold py-3 uppercase">CENTRO</TableHead>
                    <TableHead className="text-right text-[10px] font-bold min-w-[140px] uppercase">IMP. NETO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.vencimientos.list.map((c, i) => (
                    <TableRow key={i} className="text-xs">
                      <TableCell className="font-bold py-3">{c.name}</TableCell>
                      <TableCell className="text-right py-3 font-mono font-bold text-amber-600">
                        {formatCurrency(c.impact)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.vencimientos.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                    {summary.vencimientos.pieData.map((e, i) => <Cell key={i} fill={CHART_COLORS[(i + 4) % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      <Card className="border-teal-200 shadow-sm">
        <CardHeader className="flex flex-col md:flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <CalendarRange className="w-5 h-5" /> Matriz de ajustes diarios (Z59-Z60-Z65-Z66)
          </CardTitle>
          <Select value={matrixCenterFilter} onValueChange={setMatrixCenterFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Centros</SelectItem>
              {centers.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="text-[10px] font-bold py-3 uppercase">Material</TableHead>
                  {summary.sortedDays.map(day => (
                    <TableHead key={day} className="text-[10px] font-bold text-center border-l">{day}</TableHead>
                  ))}
                  <TableHead className="text-[10px] font-bold text-right bg-muted border-l min-w-[120px]">IMP. NETO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.matrixRows.map((row, i) => (
                  <TableRow key={i} className="text-xs">
                    <TableCell className="py-2">
                      <div className="font-bold">{row.code}</div>
                      <div className="text-[9px] text-muted-foreground uppercase truncate max-w-[150px]">{row.description}</div>
                    </TableCell>
                    {summary.sortedDays.map(day => (
                      <TableCell key={day} className={cn(
                        "text-center py-2 font-mono border-l",
                        row.days[day] !== undefined ? (row.days[day] < 0 ? 'text-red-500 font-bold' : 'text-primary font-bold') : 'text-muted-foreground/20'
                      )}>
                        {row.days[day]?.toLocaleString() || '-'}
                      </TableCell>
                    ))}
                    <TableCell className={cn("text-right font-bold font-mono py-2 bg-muted/20 border-l", row.netImpact < 0 ? 'text-red-500' : 'text-teal-600')}>
                      {formatCurrency(row.netImpact)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-lg flex items-center gap-2 text-primary">
            <Package className="w-5 h-5" /> Detalle diferencias de inventario por Material/Valor
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="py-4">
                  <div className="text-[10px] font-bold mb-2 uppercase">Material</div>
                  <Input placeholder="Buscar..." className="h-8 text-[11px]" value={colFilterMaterial} onChange={(e) => setColFilterMaterial(e.target.value)} />
                </TableHead>
                <TableHead className="py-4">
                  <div className="text-[10px] font-bold mb-2 uppercase">Descripción</div>
                  <Input placeholder="Buscar..." className="h-8 text-[11px]" value={colFilterDescription} onChange={(e) => setColFilterDescription(e.target.value)} />
                </TableHead>
                <TableHead className="py-4 text-center">
                  <div className="text-[10px] font-bold mb-2 uppercase">Centro</div>
                  <Input placeholder="Centro..." className="h-8 text-[11px]" value={colFilterCenter} onChange={(e) => setColFilterCenter(e.target.value)} />
                </TableHead>
                <TableHead className="text-right pr-6 font-bold text-[10px] min-w-[120px]">IMP. NETO</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.filteredTechnical.slice(0, 200).map((row, i) => (
                <TableRow key={i} className="text-[11px]">
                  <TableCell className="font-bold py-3">{row.productCode}</TableCell>
                  <TableCell className="py-3 uppercase">{row.productDescription}</TableCell>
                  <TableCell className="text-center py-3">{row.center}</TableCell>
                  <TableCell className={cn("text-right py-3 pr-6 font-mono font-bold", row.calculatedImpact < 0 ? 'text-red-500' : 'text-teal-600')}>
                    {formatCurrency(row.calculatedImpact)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <footer className="text-center pt-20 pb-10 border-t space-y-2">
        <p className="text-sm font-bold text-primary">Creado por: jugonza@ccu.cl</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50">
          Analizador de Insights de Inventario • Gestión de Datos de Precisión SAP
        </p>
      </footer>
    </div>
  );
}
