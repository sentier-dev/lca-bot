import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

afterEach(cleanup)

describe('ConfirmDialog', () => {
  it('renders title and description, and calls onConfirm/onCancel with explicit labels', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    renderWithIntl(
      <ConfirmDialog
        open
        title="Delete project"
        description="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByText('Delete project')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('falls back to common.confirm/common.cancel when no labels are passed', () => {
    renderWithIntl(
      <ConfirmDialog
        open
        title="Delete project"
        description="This cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})
