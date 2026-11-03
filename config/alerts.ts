// config/alerts.ts
interface AlertRule {
  symptomId: string;
  severity: "leve" | "media" | "fuerte";
  trigger: boolean; // simple flag for demo
}

export const alerts: AlertRule[] = [
  // Example rule: if severe symptom "dolor pecho" triggers emergency alert
  { symptomId: "dolor_pecho", severity: "fuerte", trigger: true },
];

export function shouldTriggerAlert(entry: { symptoms: { id: string; severity: string }[] }): boolean {
  for (const sym of entry.symptoms) {
    const rule = alerts.find(a => a.symptomId === sym.id && a.severity === sym.severity);
    if (rule && rule.trigger) return true;
  }
  return false;
}
