import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import {
  Button,
  Detail,
  DetailList,
  EmptyState,
  Field,
  PageHeader,
  SectionCard,
  Select,
  Textarea,
  TextInput,
} from '../components/ui'
import { ShieldAlert } from 'lucide-react'
import { formatDuration, formatPrice } from '../lib/format'

const STATUSES = ['confirmed', 'completed', 'cancelled']
const PAYMENT_STATUSES = [
  ['unpaid', 'Unpaid'],
  ['advance_paid', 'Advance paid'],
  ['paid', 'Paid in full'],
]
const cap = (s) => s[0].toUpperCase() + s.slice(1)

const todayIso = () => new Date().toISOString().slice(0, 10)

const EMPTY = {
  customer_name: '',
  phone: '',
  gender: '',
  category_id: '',
  service_id: '',
  stylist_id: '',
  appointment_date: todayIso(),
  appointment_time: '',
  status: 'confirmed',
  payment_status: 'unpaid',
  message: '',
  notes: '',
}

/**
 * New Offline Appointment — a dedicated page (not a modal) for staff to register
 * a walk-in / phone / in-person booking. Uses the live service catalogue; the
 * backend snapshots duration / price / advance from the chosen service, so those
 * are shown read-only here and never sent in the payload.
 */
export default function OfflineAppointmentNewPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const canSeeCatalogue = can('services.view')

  const [form, setForm] = useState(EMPTY)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const categories = useQuery('/admin/service-categories', {
    params: { per_page: 100 },
    enabled: canSeeCatalogue,
  })
  const services = useQuery('/admin/services', {
    params: { per_page: 200, category_id: form.category_id || undefined },
    deps: [form.category_id],
    enabled: canSeeCatalogue && !!form.category_id,
  })
  const stylists = useQuery('/admin/stylists', { params: { per_page: 100 } })

  const selectedService = useMemo(
    () => (services.data ?? []).find((s) => String(s.id) === String(form.service_id)),
    [services.data, form.service_id],
  )

  const advanceAmount = selectedService
    ? Math.round(Number(selectedService.price || 0) * Number(selectedService.advance_percentage || 0)) / 100
    : 0

  const { mutate, pending, fieldErrors } = useMutation(
    () =>
      api.post('/admin/appointments', {
        customer_name: form.customer_name.trim(),
        phone: form.phone.trim(),
        gender: form.gender,
        category_id: form.category_id ? Number(form.category_id) : null,
        service_id: form.service_id ? Number(form.service_id) : null,
        stylist_id: form.stylist_id ? Number(form.stylist_id) : null,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        status: form.status,
        payment_status: form.payment_status,
        message: form.message.trim() || null,
        notes: form.notes.trim() || null,
      }),
    {
      successMessage: 'Offline appointment created.',
      onSuccess: () => navigate('/admin/appointments/history'),
    },
  )

  if (!canSeeCatalogue) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Service catalogue access needed"
        description="Creating an offline appointment needs the services.view permission so you can pick a service. Ask a superadmin."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="New Offline Appointment"
        description="Register a walk-in, phone booking or in-person appointment. It is recorded as an offline / admin-created appointment."
      />

      <form
        className="mx-auto flex max-w-2xl flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
      >
        <SectionCard title="Customer" bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field label="Customer name" required error={fieldErrors.customer_name} reserveMessage>
            <TextInput
              autoFocus
              value={form.customer_name}
              onChange={(e) => set({ customer_name: e.target.value })}
            />
          </Field>
          <Field label="Phone" required error={fieldErrors.phone} reserveMessage>
            <TextInput
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set({ phone: e.target.value })}
            />
          </Field>
          <Field label="Gender" required error={fieldErrors.gender} reserveMessage>
            <Select value={form.gender} onChange={(e) => set({ gender: e.target.value })}>
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="unisex">Not specified</option>
            </Select>
          </Field>
        </SectionCard>

        <SectionCard title="Service">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" required error={fieldErrors.category_id} reserveMessage>
              <Select
                value={form.category_id}
                onChange={(e) => set({ category_id: e.target.value, service_id: '' })}
              >
                <option value="">Select</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.gender})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Service" required error={fieldErrors.service_id} reserveMessage>
              <Select
                value={form.service_id}
                onChange={(e) => set({ service_id: e.target.value })}
                disabled={!form.category_id || services.loading}
              >
                <option value="">
                  {!form.category_id ? 'Choose a category first' : 'Select a service'}
                </option>
                {(services.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Stylist"
              hint="Leave as “Any available” if not assigned"
              error={fieldErrors.stylist_id}
              reserveMessage
            >
              <Select value={form.stylist_id} onChange={(e) => set({ stylist_id: e.target.value })}>
                <option value="">Any available stylist</option>
                {(stylists.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {selectedService && (
            <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3.5">
              <DetailList columns={4} className="gap-y-2">
                <Detail label="Duration" value={formatDuration(selectedService.duration_minutes)} />
                <Detail label="Price" value={formatPrice(selectedService.price)} />
                <Detail
                  label="Advance %"
                  value={
                    selectedService.advance_percentage
                      ? `${selectedService.advance_percentage}%`
                      : '—'
                  }
                />
                <Detail
                  label="Advance amount"
                  value={
                    selectedService.advance_percentage ? formatPrice(advanceAmount) : '—'
                  }
                />
              </DetailList>
              <p className="mt-2 text-xs text-[var(--color-faint)]">
                Recorded from the current service configuration when the appointment is saved.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Schedule & status" bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field label="Appointment date" required error={fieldErrors.appointment_date} reserveMessage>
            <TextInput
              type="date"
              value={form.appointment_date}
              onChange={(e) => set({ appointment_date: e.target.value })}
            />
          </Field>
          <Field label="Appointment time" required error={fieldErrors.appointment_time} reserveMessage>
            <TextInput
              type="time"
              value={form.appointment_time}
              onChange={(e) => set({ appointment_time: e.target.value })}
            />
          </Field>
          <Field label="Appointment status" error={fieldErrors.status} reserveMessage>
            <Select value={form.status} onChange={(e) => set({ status: e.target.value })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {cap(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Payment status" error={fieldErrors.payment_status} reserveMessage>
            <Select
              value={form.payment_status}
              onChange={(e) => set({ payment_status: e.target.value })}
            >
              {PAYMENT_STATUSES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </SectionCard>

        <SectionCard title="Notes" bodyClassName="flex flex-col gap-4">
          <Field
            label="Customer message"
            hint="Anything the customer asked for"
            error={fieldErrors.message}
          >
            <Textarea
              rows={2}
              value={form.message}
              onChange={(e) => set({ message: e.target.value })}
            />
          </Field>
          <Field
            label="Internal notes"
            hint="Staff only — not shown to the customer"
            error={fieldErrors.notes}
          >
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>
        </SectionCard>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => navigate('/admin/appointments/history')} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Create appointment
          </Button>
        </div>
      </form>
    </div>
  )
}
