import * as XLSX from 'xlsx';

export type MovementCategory = 'Diferencias de Inventario' | 'Mermas' | 'Vencimientos' | 'Otros';

export interface AnalysisResult {
  productCode: string;
  productDescription: string;
  movementType: string;
  category: MovementCategory;
  center: string;
  quantity: number;
  localAmount: number;
  factor: number;      
  calculatedImpact: number;
}

export async function parseExcel<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function getCategory(movementType: string): MovementCategory {
  const mt = String(movementType).toLowerCase().trim();
  
  if (['z59', 'z60', 'z65', 'z66'].includes(mt)) return 'Diferencias de Inventario';
  if (['z42', 'z43'].includes(mt)) return 'Mermas';
  if (['z44', 'z45'].includes(mt)) return 'Vencimientos';
  
  return 'Otros';
}

export function performAnalysis(
  movements: any[],
  valuations: any[]
): AnalysisResult[] {
  const getVal = (obj: any, targetKeys: string[]) => {
    const objKeys = Object.keys(obj);
    for (const target of targetKeys) {
      const found = objKeys.find(k => k.toLowerCase().replace(/\s/g, '') === target.toLowerCase().replace(/\s/g, ''));
      if (found) return obj[found];
    }
    return undefined;
  };

  const factorMap = new Map<string, number>();
  valuations.forEach((v) => {
    const code = getVal(v, ['productCode', 'Material', 'Código', 'codigo', 'ProductCode']);
    const factor = getVal(v, ['factor', 'Factor', 'Valuation Factor', 'Unit Value']);
    if (code !== undefined && factor !== undefined) {
      factorMap.set(String(code).trim(), Number(factor));
    }
  });

  const consolidated = new Map<string, AnalysisResult>();

  movements.forEach((m) => {
    const code = String(getVal(m, ['productCode', 'Material', 'Código', 'codigo', 'ProductCode']) || '').trim();
    if (!code) return;

    const description = String(getVal(m, ['Texto breve material', 'Description', 'Material Description']) || 'Sin descripción');
    const type = String(getVal(m, ['movementType', 'Clase de mov.', 'Tipo Movimiento', 'MovementType', 'Clase de movimiento']) || 'N/A');
    const category = getCategory(type);
    const center = String(getVal(m, ['center', 'Centro', 'centro', 'Center']) || 'Unknown');
    const qty = Number(getVal(m, ['Ctd.en UM entrada', 'quantity', 'Cantidad', 'cantidad', 'Quantity']) || 0);
    const localAmount = Number(getVal(m, ['localAmount', 'Impte.mon.local', 'Importe', 'Amount']) || 0);
    const factor = factorMap.get(code) || 0;
    const impact = localAmount * factor;

    const key = `${code}-${center}-${category}`;

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      existing.quantity += qty;
      existing.localAmount += localAmount;
      existing.calculatedImpact += impact;
    } else {
      consolidated.set(key, {
        productCode: code,
        productDescription: description,
        movementType: type,
        category,
        center,
        quantity: qty,
        localAmount,
        factor,
        calculatedImpact: impact
      });
    }
  });

  return Array.from(consolidated.values())
    .sort((a, b) => Math.abs(b.calculatedImpact) - Math.abs(a.calculatedImpact));
}

export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Analisis_Consolidado");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}