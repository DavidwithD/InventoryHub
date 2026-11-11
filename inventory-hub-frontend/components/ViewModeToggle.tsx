'use client';

import { IconButton, Tooltip } from '@mui/material';
import TableRowsIcon from '@mui/icons-material/TableRows';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import type { ViewMode } from '@/lib/stores/viewModeStore';

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** One icon button. It shows the icon of the view it switches to. */
export default function ViewModeToggle({ mode, onChange }: Props) {
  const next: ViewMode = mode === 'table' ? 'card' : 'table';
  const label = next === 'card' ? '切换到卡片视图' : '切换到表格视图';

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => onChange(next)}>
        {next === 'card' ? <ViewAgendaIcon /> : <TableRowsIcon />}
      </IconButton>
    </Tooltip>
  );
}
