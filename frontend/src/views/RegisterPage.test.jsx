import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n/LanguageContext'
import { RegisterPage } from './RegisterPage'

const mockRegister = vi.fn()
const mockPost = vi.fn()

vi.mock('../api/http', () => ({
  http: {
    post: (...args) => mockPost(...args),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ register: (...args) => mockRegister(...args) }),
}))

describe('RegisterPage', () => {
  beforeEach(() => {
    mockRegister.mockReset()
    mockPost.mockReset()
  })

  it('shows backend validation error message on failed registration', async () => {
    mockPost.mockImplementation((url) => {
      if (url === '/auth/otp/generate') return Promise.resolve({ data: { debugOtp: '123456' } })
      if (url === '/auth/otp/verify') return Promise.resolve({ data: { verified: true } })
      return Promise.resolve({ data: {} })
    })

    mockRegister.mockRejectedValue({
      response: {
        data: {
          error: 'Email already exists',
        },
      },
    })

    render(
      <LanguageProvider>
        <MemoryRouter>
          <RegisterPage />
        </MemoryRouter>
      </LanguageProvider>,
    )

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Already User' } })
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'already@test.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password@123' } })

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    fireEvent.change(screen.getByLabelText('Aadhaar Number'), { target: { value: '123456789012' } })
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }))
    await waitFor(() => expect(screen.getByText(/debug otp/i)).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('6-digit OTP'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }))
    await waitFor(() => expect(screen.getByText('Aadhaar verified successfully')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(mockRegister).toHaveBeenCalled())

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })
})
