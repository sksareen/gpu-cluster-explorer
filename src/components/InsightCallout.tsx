import { Insight } from '../types';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface Props {
  insights: Insight[];
}

const ICONS = {
  warning: AlertTriangle,
  info: Info,
  critical: AlertCircle,
};

const COLORS = {
  warning: { bg: '#422006', border: '#854d0e', text: '#fbbf24' },
  info: { bg: '#0c1929', border: '#1e3a5f', text: '#60a5fa' },
  critical: { bg: '#2a0a0a', border: '#7f1d1d', text: '#f87171' },
};

export function InsightCallout({ insights }: Props) {
  const visible = insights.slice(-3);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {visible.map(insight => {
        const Icon = ICONS[insight.type];
        const colors = COLORS[insight.type];
        return (
          <div
            key={insight.id}
            className="flex items-start gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
          >
            <Icon size={16} color={colors.text} className="mt-0.5 shrink-0" />
            <div>
              <span className="font-medium" style={{ color: colors.text }}>{insight.title}: </span>
              <span style={{ color: '#e2e8f0' }}>{insight.description}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
