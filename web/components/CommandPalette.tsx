'use client'

import * as React from 'react'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { useRouter } from 'next/navigation'

export default function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar (⌘K) pagos, citas, pacientes..." />
      <CommandList>
        <CommandEmpty>Sin resultados</CommandEmpty>
        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard') }}>Dashboard</CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard/appointments') }}>Citas</CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard/payments') }}>Pagos</CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard/patients') }}>Pacientes</CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard/professionals') }}>Profesionales</CommandItem>
          <CommandItem onSelect={() => { setOpen(false); router.push('/dashboard/services') }}>Servicios</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}


