import { describe, it, expect, afterEach } from 'vitest'
import { screen, cleanup } from '@testing-library/react'
import { renderWithIntl } from '../../../helpers/render-with-intl'
import { PasswordRequirements } from '@/components/ui/password-requirements'

afterEach(cleanup)

describe('PasswordRequirements', () => {
  it('maps each check id to its translated password.<id> catalog label in en', () => {
    renderWithIntl(<PasswordRequirements password="" />)

    expect(screen.getByText('At least 10 characters')).toBeInTheDocument()
    expect(screen.getByText('One uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('One number')).toBeInTheDocument()
    expect(screen.getByText('One special character')).toBeInTheDocument()
  })

  it('exposes the translated aria-label on the requirements list', () => {
    renderWithIntl(<PasswordRequirements password="" />)

    expect(screen.getByRole('list', { name: 'Password requirements' })).toBeInTheDocument()
  })

  it('renders nothing once every requirement is met', () => {
    renderWithIntl(<PasswordRequirements password="Securepass1!" />)

    expect(screen.queryByText('At least 10 characters')).not.toBeInTheDocument()
  })
})
