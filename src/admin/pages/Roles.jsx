import { useState } from 'react'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useQuery } from '../hooks/useQuery'
import { useMutation } from '../hooks/useMutation'
import { Modal, ConfirmDialog } from '../components/Modal'
import {
  Button,
  ChipButton,
  ErrorState,
  Field,
  LoadingBlock,
  PageHeader,
  TextInput,
} from '../components/ui'
import { titleCase } from '../lib/format'

export default function RolesPage() {
  const { can } = useAuth()
  const canManage = can('roles.manage')

  const rolesQuery = useQuery('/admin/roles')
  const permsQuery = useQuery('/admin/permissions')

  const [modal, setModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const deleteMut = useMutation((id) => api.delete(`/admin/roles/${id}`), {
    successMessage: 'Role deleted.',
    onSuccess: () => {
      setDeleteTarget(null)
      rolesQuery.refetch()
    },
  })

  const loading = rolesQuery.loading || permsQuery.loading
  const error = rolesQuery.error || permsQuery.error

  const groups = permsQuery.data?.groups ?? {}
  const allPerms = permsQuery.data?.all ?? []

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description="What each role can do in this admin. The superadmin role always has full access."
      >
        {canManage && (
          <Button size="sm" onClick={() => setModal({ mode: 'create' })}>
            <Plus size={15} /> New role
          </Button>
        )}
      </PageHeader>

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <ErrorState error={error} onRetry={rolesQuery.refetch} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rolesQuery.data.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              groups={groups}
              allPerms={allPerms}
              canManage={canManage}
              onEdit={() => setModal({ mode: 'edit', role })}
              onDelete={() => setDeleteTarget(role)}
            />
          ))}
        </div>
      )}

      {modal && (
        <RoleFormModal
          mode={modal.mode}
          role={modal.role}
          groups={groups}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            rolesQuery.refetch()
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        pending={deleteMut.pending}
        title={`Delete the “${deleteTarget?.name}” role?`}
        message={
          deleteTarget?.users_count > 0
            ? `${deleteTarget.users_count} user(s) still have this role. Reassign them first — the server will reject this otherwise.`
            : 'Users will need a new role assigned.'
        }
        confirmLabel="Delete role"
      />
    </div>
  )
}

function RoleCard({ role, groups, allPerms, canManage, onEdit, onDelete }) {
  const held = new Set(role.is_protected ? allPerms : role.permissions)
  const groupEntries = Object.entries(groups)

  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-medium text-[var(--color-ink)]">
            {role.is_protected && <Lock size={13} className="text-[var(--color-faint)]" />}
            {titleCase(role.name)}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
            {role.users_count ?? 0} user{role.users_count === 1 ? '' : 's'}
            {role.is_protected ? ' · full access, locked' : ''}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit role"
              disabled={role.is_protected}
              onClick={onEdit}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete role"
              className="text-[var(--color-danger)]"
              disabled={role.is_protected}
              onClick={onDelete}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 border-t border-[var(--color-line)] pt-3">
        {groupEntries.map(([group, perms]) => {
          const on = perms.filter((p) => held.has(p)).length
          return (
            <div key={group} className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-ink-soft)]">{titleCase(group)}</span>
              <span
                className={
                  on === 0
                    ? 'text-[var(--color-faint)]'
                    : on === perms.length
                      ? 'text-[var(--color-ok)]'
                      : 'text-[var(--color-warn)]'
                }
              >
                {on} / {perms.length}
              </span>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function RoleFormModal({ mode, role, groups, onClose, onSaved }) {
  const [name, setName] = useState(role?.name ?? '')
  const [selected, setSelected] = useState(new Set(role?.permissions ?? []))

  const { mutate, pending, fieldErrors } = useMutation(
    () => {
      const payload = { name, permissions: [...selected] }
      return mode === 'create'
        ? api.post('/admin/roles', payload)
        : api.put(`/admin/roles/${role.id}`, payload)
    },
    {
      successMessage: mode === 'create' ? 'Role created.' : 'Role updated.',
      onSuccess: onSaved,
    },
  )

  const toggle = (perm) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(perm) ? next.delete(perm) : next.add(perm)
      return next
    })

  const toggleGroup = (perms) =>
    setSelected((prev) => {
      const next = new Set(prev)
      const allOn = perms.every((p) => next.has(p))
      perms.forEach((p) => (allOn ? next.delete(p) : next.add(p)))
      return next
    })

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === 'create' ? 'New role' : `Edit ${titleCase(role.name)}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => mutate()} loading={pending}>
            {mode === 'create' ? 'Create role' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          mutate()
        }}
      >
        <Field
          label="Role name"
          required
          hint="Lowercase, e.g. receptionist, manager"
          error={fieldErrors.name}
        >
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <div>
          <p className="label">Permissions</p>
          {fieldErrors.permissions && (
            <p className="mb-2 text-xs text-[var(--color-danger)]">{fieldErrors.permissions}</p>
          )}
          <div className="flex flex-col gap-2">
            {Object.entries(groups).map(([group, perms]) => {
              const allOn = perms.every((p) => selected.has(p))
              return (
                <div
                  key={group}
                  className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {titleCase(group)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleGroup(perms)}
                      className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                    >
                      {allOn ? 'Clear' : 'Select all'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((perm) => (
                      <ChipButton
                        key={perm}
                        active={selected.has(perm)}
                        onClick={() => toggle(perm)}
                      >
                        {perm.split('.')[1]}
                      </ChipButton>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </form>
    </Modal>
  )
}
