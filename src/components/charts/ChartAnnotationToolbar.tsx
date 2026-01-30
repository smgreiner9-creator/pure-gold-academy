'use client'

export type AnnotationTool =
  | 'horizontal_line'
  | 'trend_line'
  | 'entry'
  | 'exit'
  | 'stop_loss'
  | 'take_profit'
  | 'text'
  | null

interface ChartAnnotationToolbarProps {
  activeTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  onClear: () => void
}

const tools: { id: AnnotationTool; icon: string; label: string }[] = [
  { id: 'horizontal_line', icon: 'horizontal_rule', label: 'Horizontal Line' },
  { id: 'trend_line', icon: 'show_chart', label: 'Trend Line' },
  { id: 'entry', icon: 'login', label: 'Entry Marker' },
  { id: 'exit', icon: 'logout', label: 'Exit Marker' },
  { id: 'stop_loss', icon: 'block', label: 'Stop Loss' },
  { id: 'take_profit', icon: 'flag', label: 'Take Profit' },
  { id: 'text', icon: 'text_fields', label: 'Text Note' },
]

export function ChartAnnotationToolbar({
  activeTool,
  onToolChange,
  onClear,
}: ChartAnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 rounded-xl glass-surface overflow-x-auto">
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          onClick={() => onToolChange(activeTool === tool.id ? null : tool.id)}
          className={`relative group flex items-center justify-center w-9 h-9 rounded-lg transition-all shrink-0 ${
            activeTool === tool.id
              ? 'bg-[var(--gold)] text-black'
              : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-black/5'
          }`}
          title={tool.label}
        >
          <span className="material-symbols-outlined text-[20px]">{tool.icon}</span>
          {/* Tooltip */}
          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-black/90 border border-[var(--glass-surface-border)] text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Divider */}
      <div className="w-px h-6 bg-[var(--glass-surface-border)] mx-1 shrink-0" />

      {/* Clear button */}
      <button
        type="button"
        onClick={onClear}
        className="relative group flex items-center justify-center w-9 h-9 rounded-lg text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all shrink-0"
        title="Clear All"
      >
        <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
        <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-black/90 border border-[var(--glass-surface-border)] text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
          Clear All
        </span>
      </button>
    </div>
  )
}
