import { useMemo, useState } from 'react'
import { Pencil, Trash2, UserPlus, Users as UsersIcon } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useDebounced } from '../hooks/useDebounced'
import { useMutation } from '../hooks/useMutation'
import { DataTable, Pagination } from '../components/DataTable'
import { Modal, ConfirmDialog } from '../components/Modal'
import {
  ActiveBadge,
  Button,
  ChipButton,
  EmptyState,
  ErrorState,
  Field,
  PageHeader,
  SearchInput,
  Select,
  TextInput,
  Toggle,
  Toolbar,
} from '../components/ui'
import { initials, relativeTime } from '../lib/format'

export default function UsersPage() {
  const { can, isSuperadmin, user: me } = useAuth()
  const canManage = can('users.manage')

  const [filters, setFilters] = useState({ search: '', status: '', role: '' })
  const [page, setPage] = useState(1)
  const search = useDebounced(filters.search)

  const params = useMemo(
    () => ({ search, status: filters.status, role: filters.role, page, per_page: 15 }),
    [search, filters.status, filters.role, page],
  )
  const { data, meta, loading, error, refetch, refetching } = useQuery('/admin/users', {
    params,
    deps: [params],
  })

  const rolesQuery = useQuery('/admin/roles', { enabled: can('roles.view') })
  const roleNames = (rolesQuery.data ?? []).map((r) => r.name)

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const deleteMut = useMutation((id) => api.delete(`/admin/users/${id}`), {
    successMessage: 'User deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      refetch()
    },
  })

  const setFilter = (patch) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const editable = (u) => canManage && !(u.roles.includes('superadmin') && !isSuperadmin)

  const columns = [
    {
      key: 'user',
      header: 'User',
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] text-xs font-semibold text-[var(--color-ink-soft)]">
            {initials(u.name)}
          </span>
          <div>
            <p className="font-medium text-[var(--color-ink)]">
              {u.name}
              {u.id === me?.id && (
                <span className="ml-1.5 text-xs font-normal text-[var(--color-faint)]">
                  (you)
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--color-muted)]">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Roles',
      hideBelow: 'sm',
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length ? (
            u.roles.map((r) => (
              <span
                key={r}
                className="rounded-[3px] bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[0.6875rem] font-medium text-[var(--color-accent)]"
              >
                {r}
              </span>
            ))
          ) : (
            <span className="text-xs text-[var(--color-faint)]">No role</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideBelow: 'md',
      cell: (u) => <ActiveBadge active={u.status === 'active'} />,
    },
    {
      key: 'created',
      header: 'Added',
      hideBelow: 'lg',
      cell: (u) => (
        <span className="text-xs text-[var(--color-muted)]">{relativeTime(u.created_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (u) =>
        editable(u) ? (
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit user"
              onClick={() => setModal({ mode: 'edit', user: u })}
            >
              <Pencil size={14} />
            </Button>
            {u.id !== me?.id && (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete user"
                className="text-[var(--color-danger)]"
                onClick={() => setDeleteTarget(u)}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader title="Users" description="Studio staff who can sign in to this admin.">
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <UserPlus size={15} /> New user
          </Button>
        )}
      </PageHeader>

      <Toolbar>
        <SearchInput
          wrapperClassName="min-w-[12rem] flex-1"
          placeholder="Name or email"
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
        />
        <Field label="Status" className="w-36">
          <Select value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        {roleNames.length > 0 && (
          <Field label="Role" className="w-40">
            <Select value={filters.role} onChange={(e) => setFilter({ role: e.target.value })}>
              <option value="">Any role</option>
              {roleNames.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Toolbar>

      <div className="card">
        {error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={data}
              loading={loading}
              refetching={refetching}
              serialFrom={meta?.from ?? 1}
              empty={
                <EmptyState
                  icon={UsersIcon}
                  title="No users found"
                  description="Adjust the filters or add a new user."
                />
              }
            />
            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </div>

      {modal && (
        <UserFormModal
          mode={modal.mode}
          user={modal.user}
          roleNames={roleNames}
          canAssignSuperadmin={isSuperadmin}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            refetch()
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        pending={deleteMut.pending}
        title={`Delete ${deleteTarget?.name}?`}
        message="They lose access immediately. This can't be undone."
        confirmLabel="Delete user"
      />
    </div>
  )
}

function UserFormModal({
  mode,
  user,
  roleNames,
  canAssignSuperadmin,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    password_confirmation: '',
    status: user ? user.status === 'active' : true,
  })
  const [roles, setRoles] = useState(new Set(user?.roles ?? []))

  const assignable = roleNames.filter(
    (r) => r !== 'superadmin' || canAssignSuperadmin || roles.has('superadmin'),
  )

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const payload = {
        name: form.name,
        email: form.email,
        status: form.status ? 'active' : 'inactive',
        roles: [...roles],
      }
      if (form.password) {
        payload.password = form.password
        payload.password_confirmation = form.password_confirmation
      }
      return mode === 'create'
        ? api.post('/admin/users', payload)
        : api.put(`/admin/users/${user.id}`, payload)
    },
    {
      successMessage: mode === 'create' ? 'User created.' : 'User updated.',
      onSuccess: onSaved,
    },
  )

  const toggleRole = (r) =>
    setRoles((prev) => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'New user' : `Edit ${user.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={pending}>
            {mode === 'create' ? 'Create user' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
      >
        <Field label="Name" required error={fieldErrors.name}>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field label="Email" required error={fieldErrors.email}>
          <TextInput
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={mode === 'create' ? 'Password' : 'New password'}
            required={mode === 'create'}
            hint={mode === 'edit' ? 'Leave blank to keep current' : 'At least 8 characters'}
            error={fieldErrors.password}
          >
            <TextInput
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </Field>
          <Field label="Confirm password">
            <TextInput
              type="password"
              autoComplete="new-password"
              value={form.password_confirmation}
              onChange={(e) =>
                setForm((f) => ({ ...f, password_confirmation: e.target.value }))
              }
            />
          </Field>
        </div>

        {roleNames.length > 0 ? (
          <Field label="Roles" error={fieldErrors.roles}>
            <div className="flex flex-wrap gap-2">
              {assignable.map((r) => (
                <ChipButton
                  key={r}
                  active={roles.has(r)}
                  onClick={() => toggleRole(r)}
                >
                  {r}
                </ChipButton>
              ))}
            </div>
          </Field>
        ) : (
          <p className="text-xs text-[var(--color-faint)]">
            You don't have permission to view roles, so role assignment is unavailable.
          </p>
        )}

        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-sm text-[var(--color-ink-soft)]">Account active</span>
          <Toggle
            id="user-status"
            checked={form.status}
            onChange={(v) => setForm((f) => ({ ...f, status: v }))}
          />
        </div>
        {fieldErrors.status && (
          <p className="text-xs text-[var(--color-danger)]">{fieldErrors.status}</p>
        )}
        {fieldErrors.user && (
          <p className="text-xs text-[var(--color-danger)]">{fieldErrors.user}</p>
        )}
      </form>
    </Modal>
  )
}
