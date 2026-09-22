import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'

afterEach(cleanup)

function renderDialog(overrides: { onConfirm?: () => void; onCancel?: () => void } = {}) {
  const onConfirm = overrides.onConfirm ?? vi.fn()
  const onCancel = overrides.onCancel ?? vi.fn()
  renderWithIntl(
    <TypedConfirmDialog
      open
      title="Delete account"
      description="Type delete my account to confirm."
      confirmationPhrase="delete my account"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  )
  return { onConfirm, onCancel }
}

describe('TypedConfirmDialog defaults', () => {
  it('falls back to common.confirm/common.cancel when no labels are passed', () => {
    renderWithIntl(
      <TypedConfirmDialog
        open
        title="Delete account"
        description="Type delete my account to confirm."
        confirmationPhrase="delete my account"
        variant="danger"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })
})

describe('TypedConfirmDialog', () => {
  it('renders title, description, and both buttons', () => {
    renderDialog()
    expect(screen.getByText('Delete account')).toBeInTheDocument()
    expect(screen.getByText(/Type delete my account/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('disables the confirm button until the phrase is typed', () => {
    renderDialog()
    const confirm = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
  })

  it('enables confirm on exact phrase match', () => {
    renderDialog()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'delete my account' } })
    const confirm = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
  })

  it('enables on case-insensitive match', () => {
    renderDialog()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'DELETE MY ACCOUNT' } })
    const confirm = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
  })

  it('enables on trimmed match', () => {
    renderDialog()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '  delete my account  ' } })
    const confirm = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
  })

  it('keeps confirm disabled on partial match', () => {
    renderDialog()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'delete my' } })
    const confirm = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
  })

  it('calls onConfirm when the enabled confirm button is clicked', () => {
    const { onConfirm } = renderDialog()
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'delete my account' } })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onCancel when the cancel button is clicked', () => {
    const { onCancel } = renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
