'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePayments, usePaymentStats, type PaymentStatus } from '@/src/hooks/usePayments'
import { Search, Calendar as CalendarIcon, CreditCard, DollarSign } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import Button from '@/components/ui/button'

export default function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'todos' | PaymentStatus>('todos')
  const [method, setMethod] = useState<'todos' | string>('todos')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const { data: stats } = usePaymentStats({ startDate, endDate })
  const { data: payments = [], isLoading } = usePayments({ search, status, method, startDate, endDate })

  const methods = useMemo(() => {
    const s = new Set(payments.map(p => p.payment_method).filter(Boolean) as string[])
    return Array.from(s)
  }, [payments])

  const formatCurrency = (value: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Pagos</h1>
        <p className="text-sm text-gray-600">Gestión de cobros, pendientes y reembolsos</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between"><span className="text-gray-600 text-sm">Pagos completados</span><DollarSign className="w-5 h-5 text-green-600"/></div>
          <div className="mt-2 text-2xl font-semibold text-gray-800">{formatCurrency(stats?.sumPaid || 0)}</div>
          <div className="text-xs text-gray-500">{stats?.countPaid || 0} pagos</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between"><span className="text-gray-600 text-sm">Pendientes</span><CreditCard className="w-5 h-5 text-yellow-600"/></div>
          <div className="mt-2 text-2xl font-semibold text-gray-800">{formatCurrency(stats?.sumPending || 0)}</div>
          <div className="text-xs text-gray-500">{stats?.countPending || 0} pagos</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between"><span className="text-gray-600 text-sm">Reembolsados</span><DollarSign className="w-5 h-5 text-purple-600"/></div>
          <div className="mt-2 text-2xl font-semibold text-gray-800">{formatCurrency(stats?.sumRefunded || 0)}</div>
          <div className="text-xs text-gray-500">{stats?.countRefunded || 0} pagos</div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between"><span className="text-gray-600 text-sm">Total registros</span><CalendarIcon className="w-5 h-5 text-blue-600"/></div>
          <div className="mt-2 text-2xl font-semibold text-gray-800">{payments.length}</div>
          <div className="text-xs text-gray-500">últimos 30 días por defecto</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5"/>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar cliente, email, tx, servicio..." className="pl-10 pr-3 py-2 w-full border rounded-md focus:ring-2 focus:ring-green-500"/>
          </div>
          <div>
            <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="py-2 w-full border rounded-md">
              <option value="todos">Todos los estados</option>
              <option value="completed">Completado</option>
              <option value="pending">Pendiente</option>
              <option value="failed">Fallido</option>
              <option value="refunded">Reembolsado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div>
            <Popover>
              <PopoverTrigger className="py-2 px-3 w-full border rounded-md text-left">
                {method === 'todos' ? 'Todos los métodos' : method}
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[240px]">
                <Command>
                  <CommandInput placeholder="Filtrar métodos..." />
                  <CommandList>
                    <CommandEmpty>Sin resultados</CommandEmpty>
                    <CommandGroup>
                      <CommandItem onSelect={() => setMethod('todos')}>Todos los métodos</CommandItem>
                      {methods.map(m => (
                        <CommandItem key={m} onSelect={() => setMethod(m)}>{m}</CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="py-2 w-full border rounded-md"/>
          </div>
          <div>
            <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="py-2 w-full border rounded-md"/>
          </div>
          <button onClick={()=>{setSearch('');setStatus('todos');setMethod('todos');setStartDate('');setEndDate('')}} className="px-3 py-2 border rounded-md hover:bg-gray-50">Limpiar</button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600">Cargando pagos...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-600">No hay pagos con los filtros actuales</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between p-3">
              <div className="text-sm text-gray-500">{payments.length} resultados</div>
              <Button variant="outline" onClick={() => {
                const header = ['Fecha','Cliente','Email','Servicio','Profesional','Método','Estado','Monto']
                const rows = payments.map(p => [
                  new Date(p.created_at).toLocaleString('es-CO'),
                  p.patient_name||'',
                  p.patient_email||'',
                  p.service_name||'',
                  p.professional_name||'',
                  p.payment_method||'',
                  p.status,
                  String(p.amount)
                ])
                const csv = [header, ...rows].map(r=>r.map(v=>`"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `pagos-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url)
              }}>Exportar CSV</Button>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profesional</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-green-50/40 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(p.created_at).toLocaleString('es-CO')}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{p.patient_name || '—'}</div>
                      <div className="text-gray-500">{p.patient_email || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.service_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.professional_name || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{p.payment_method || '—'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        p.status === 'completed' ? 'bg-green-100 text-green-700' :
                        p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        p.status === 'refunded' ? 'bg-purple-100 text-purple-700' :
                        p.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                      <div className="flex items-center justify-end gap-3">
                        <span>{formatCurrency(p.amount)}</span>
                        <Link href={`/dashboard/payments/${p.id}`} className="text-green-600 hover:text-green-700 underline">Ver</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


