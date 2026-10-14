import { cn } from '../utils/cn'
import { passwordIssue, passwordScore } from '../utils/password'

const LEVELS = [
  null,
  { label: 'Fraca', bar: 'bg-destructive', text: 'text-destructive' },
  { label: 'Razoável', bar: 'bg-gold', text: 'text-gold-dark' },
  { label: 'Boa', bar: 'bg-success/70', text: 'text-success' },
  { label: 'Forte', bar: 'bg-success', text: 'text-success' },
]

/** Medidor abaixo do campo de nova senha. `pessoa`: { nome, email, cpf } para barrar dados pessoais. */
export function PasswordStrength({ senha, pessoa }) {
  if (!senha) {
    return <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres, com letras e números.</p>
  }
  const score = passwordScore(senha, pessoa)
  const level = LEVELS[score]
  const issue = passwordIssue(senha, pessoa)

  return (
    <div aria-live="polite">
      <div className="mb-1 flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= score ? level.bar : 'bg-chocolate/10')} />
        ))}
      </div>
      <p className="text-xs">
        <span className={cn('font-medium', level.text)}>Senha {level.label.toLowerCase()}</span>
        <span className="text-muted-foreground">
          {issue ? ` — ${issue}` : score < 4 ? ' — ficar mais longa a deixa mais segura' : ''}
        </span>
      </p>
    </div>
  )
}
