import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import {
  Button,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  SectionCard,
  Textarea,
  TextInput,
  Toggle,
} from '../components/ui'
import { titleCase } from '../lib/format'

const GROUP_ORDER = ['general', 'contact', 'shop_hours', 'social', 'branding']
const KEY_ORDER = [
  'salon_name',
  'description',
  'phone',
  'phone_href',
  'email',
  'address',
  'business_hours',
  'shop_opens_at',
  'shop_closes_at',
  'instagram_url',
  'whatsapp_url',
  'facebook_url',
  'logo_path',
  'favicon_path',
]
const keyRank = (k) => {
  const i = KEY_ORDER.indexOf(k)
  return i === -1 ? 999 : i
}
const GROUP_BLURB = {
  general: 'Studio name and the short description used across the public site.',
  contact: 'How clients reach the studio. Blank fields stay hidden on the public site.',
  shop_hours:
    'When the studio opens and closes. Shown on the public Contact page and used to set the booking form’s first and last time slot.',
  social: 'Links to the studio’s public profiles.',
  branding: 'Relative storage paths for brand assets.',
}
const LABELS = {
  salon_name: 'Salon name',
  description: 'Description',
  phone: 'Phone (display)',
  phone_href: 'Phone link (tel:)',
  email: 'Email',
  address: 'Address',
  business_hours: 'Business hours',
  shop_opens_at: 'Shop opens at',
  shop_closes_at: 'Shop closes at',
  instagram_url: 'Instagram URL',
  whatsapp_url: 'WhatsApp URL',
  facebook_url: 'Facebook URL',
  logo_path: 'Logo path',
  favicon_path: 'Favicon path',
}

export default function SettingsPage() {
  const { can } = useAuth()
  const canManage = can('settings.manage')

  const { data, loading, error, refetch } = useQuery('/admin/site-settings')

  const serverValues = useMemo(
    () =>
      Object.fromEntries(
        (data ?? []).map((s) => [s.key, s.value ?? (s.type === 'boolean' ? false : '')]),
      ),
    [data],
  )
  const [edits, setEdits] = useState({})
  const values = { ...serverValues, ...edits }
  const dirty = Object.keys(edits).length > 0

  const { mutate, pending, fieldErrors } = useMutation(
    () => api.put('/admin/site-settings', { settings: values }),
    {
      successMessage: 'Settings saved.',
      onSuccess: () => {
        setEdits({})
        refetch()
      },
    },
  )

  const grouped = useMemo(() => {
    const map = {}
    for (const s of data ?? []) {
      ;(map[s.group] ??= []).push(s)
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => keyRank(a.key) - keyRank(b.key))
    }
    return map
  }, [data])

  if (loading) return <LoadingBlock />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const groups = Object.keys(grouped).sort(
    (a, b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b),
  )

  const setValue = (key, v) => setEdits((prev) => ({ ...prev, [key]: v }))

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Studio information the public site reads through the API."
      >
        {canManage && (
          <Button size="sm" onClick={() => mutate()} loading={pending} disabled={!dirty}>
            Save changes
          </Button>
        )}
      </PageHeader>

      {!canManage && (
        <p className="mb-5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-3 py-2 text-sm text-[var(--color-muted)]">
          You can view these settings but not change them.
        </p>
      )}

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <SectionCard
            key={group}
            title={titleCase(group)}
            description={GROUP_BLURB[group]}
            bodyClassName="grid gap-4 sm:grid-cols-2"
          >
            {grouped[group].map((s) => (
              <SettingField
                key={s.key}
                setting={s}
                value={values[s.key]}
                error={fieldErrors[`settings.${s.key}`]}
                disabled={!canManage}
                onChange={(v) => setValue(s.key, v)}
              />
            ))}
          </SectionCard>
        ))}
      </div>

      {canManage && dirty && (
        <div className="sticky bottom-4 mt-5 flex justify-end">
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface-raised)] px-3 py-2 shadow-[var(--shadow-pop)]">
            <span className="text-sm text-[var(--color-muted)]">Unsaved changes</span>
            <Button size="sm" loading={pending} onClick={() => mutate()}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingField({ setting, value, error, disabled, onChange }) {
  const label = LABELS[setting.key] ?? titleCase(setting.key)

  if (setting.type === 'boolean') {
    return (
      <Field label={label} error={error} reserveMessage>
        <Toggle
          id={`set-${setting.key}`}
          checked={!!value}
          disabled={disabled}
          onChange={onChange}
        />
      </Field>
    )
  }

  const isLong = setting.type === 'text'
  const isTime = setting.type === 'time'
  const id = `set-${setting.key}`
  return (
    <Field
      label={label}
      htmlFor={id}
      error={error}
      reserveMessage
      className={isLong ? 'sm:col-span-2' : undefined}
    >
      {isLong ? (
        <Textarea
          id={id}
          rows={2}
          disabled={disabled}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <TextInput
          id={id}
          type={isTime ? 'time' : undefined}
          disabled={disabled}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  )
}
