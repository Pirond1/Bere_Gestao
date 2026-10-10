import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Field } from './Field'

export function PasswordField(props) {
  const [visible, setVisible] = useState(false)

  return (
    <Field type={visible ? 'text' : 'password'} {...props}>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-chocolate"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </Field>
  )
}