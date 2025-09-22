'use client'

import { useParams, useRouter } from 'next/navigation'
import { useMarkPaymentReceived, usePayment, useRefundPayment } from '@/src/hooks/usePayments'
import { ArrowLeft, CheckCircle2, Download, RefreshCw, Share2 } from 'lucide-react'

export default function PaymentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id
  const { data: payment } = usePayment(id)
  const markReceived = useMarkPaymentReceived()
  const refund = useRefundPayment()

  const formatCurrency = (v?: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v || 0)

  if (!payment) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2"/> Volver
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pago #{payment.id.slice(0,8)}</h1>
          <p className="text-gray-500 text-sm">{new Date(payment.created_at).toLocaleString('es-CO')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>window.print()} className="px-3 py-2 border rounded-md hover:bg-gray-50 flex items-center text-sm"><Download className="w-4 h-4 mr-2"/>Recibo</button>
          <button onClick={()=>navigator.share?.({ title: 'Pago Healing Forest', url: location.href })} className="px-3 py-2 border rounded-md hover:bg-gray-50 flex items-center text-sm"><Share2 className="w-4 h-4 mr-2"/>Compartir</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-xl border shadow-sm p-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Cliente</div>
              <div className="font-medium">{payment.patient_name || '—'}</div>
              <div className="text-gray-500">{payment.patient_email || ''}</div>
            </div>
            <div>
              <div className="text-gray-500">Servicio</div>
              <div className="font-medium">{payment.service_name || '—'}</div>
              <div className="text-gray-500">Profesional: {payment.professional_name || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Monto</div>
              <div className="font-semibold text-lg">{formatCurrency(payment.amount)}</div>
            </div>
            <div>
              <div className="text-gray-500">Método</div>
              <div className="font-medium">{payment.payment_method || '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Estado</div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                payment.status === 'refunded' ? 'bg-purple-100 text-purple-700' :
                payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>{payment.status}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-3">
          <button disabled={payment.status==='completed'} onClick={()=>markReceived.mutate(payment.id)} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"><CheckCircle2 className="w-4 h-4"/> Marcar como recibido</button>
          <button disabled={payment.status==='refunded'} onClick={()=>refund.mutate(payment.id)} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"><RefreshCw className="w-4 h-4"/> Reembolsar</button>
        </div>
      </div>
    </div>
  )
}




