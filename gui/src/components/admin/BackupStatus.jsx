import { CloudAlert, CloudCheck, DatabaseBackup, HardDrive, TriangleAlert } from 'lucide-react'

import { useAsync } from '../../hooks/useAsync'
import { getBackupStatus } from '../../services/backupService'
import { cn } from '../../utils/cn'
import { parseApiDateTime, toDateKey } from '../../utils/date'
import { Card } from '../ui/Card'

/** "hoje às 03:00", "ontem às 03:00" ou "12/10 às 03:00" */
function whenLabel(value) {
  const date = parseApiDateTime(value)
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const day =
    toDateKey(date) === toDateKey(new Date())
      ? 'hoje'
      : toDateKey(date) === toDateKey(yesterday)
        ? 'ontem'
        : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${day} às ${time}`
}

function sizeLabel(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}

const COPIA = {
  enviada: { icon: CloudCheck, text: 'Cópia guardada fora do servidor', className: 'text-success' },
  falhou: { icon: CloudAlert, text: 'Não foi possível enviar a cópia externa', className: 'text-destructive' },
  desativada: { icon: HardDrive, text: 'Guardado só no servidor', className: 'text-muted-foreground' },
}

function Details({ backup }) {
  if (backup.situacao === 'nunca') {
    return <p className="text-muted-foreground">Nenhum backup feito ainda.</p>
  }

  const copia = COPIA[backup.copia_externa]
  return (
    <div className="space-y-1">
      {backup.situacao === 'falhou' && (
        <p className="text-destructive">
          A tentativa de {whenLabel(backup.ultima_falha)} falhou: {backup.erro}.
        </p>
      )}
      {backup.ultimo_backup && (
        <p className={cn(backup.situacao === 'atrasado' && 'text-terracotta')}>
          Último backup {whenLabel(backup.ultimo_backup)}
          <span className="text-muted-foreground"> · {sizeLabel(backup.tamanho_bytes)}</span>
          {backup.situacao === 'atrasado' && ' — nenhum novo desde então'}
        </p>
      )}
      {copia && (
        <p className={cn('flex items-center gap-1.5 text-xs', copia.className)}>
          <copia.icon className="h-3.5 w-3.5" aria-hidden="true" />
          {copia.text}
        </p>
      )}
    </div>
  )
}

/** Quando foi o último backup do banco e das fotos — feito todo dia de madrugada, sem ação da dona. */
export function BackupStatus() {
  const { data: backup, loading, error } = useAsync(getBackupStatus)
  // Some sem alarde se a API não responder: é informação de apoio, não pode travar o painel
  if (error) return null

  const alert = backup && backup.situacao !== 'ok'
  const Icon = alert ? TriangleAlert : DatabaseBackup

  return (
    <Card className="flex items-start gap-3 p-4 text-sm">
      <Icon
        className={cn('mt-0.5 h-5 w-5 shrink-0', alert ? 'text-terracotta' : 'text-gold-dark')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h2 className="mb-1 text-base">Backup dos dados</h2>
        {loading ? (
          <div className="h-4 w-48 animate-pulse rounded bg-muted" aria-label="Carregando" />
        ) : (
          <Details backup={backup} />
        )}
      </div>
    </Card>
  )
}
