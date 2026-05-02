import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n/LanguageContext'
import { CitizenDashboard } from './CitizenDashboard'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../api/http', () => ({
  http: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
  },
}))

vi.mock('../api/hooks', async () => {
  const actual = await vi.importActual('../api/hooks')
  return {
    ...actual,
    useFirs: () => ({ firs: [], loading: false, error: '', reload: vi.fn() }),
  }
})

describe('CitizenDashboard OCR upload', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ data: [] })
    mockPost.mockReset()
  })

  it('uploads file for OCR and autofills FIR fields', async () => {
    mockPost.mockImplementation((url) => {
      if (url === '/citizen/ocr/extract') {
        return Promise.resolve({
          data: {
            extractedText: 'Complaint of fraud from uploaded document.',
            extractedName: 'Rahul',
            suggestedLocation: 'Indore',
            keywords: 'fraud, cyber',
            suggestedCategory: 'CYBERCRIME',
            suggestedPriority: 'HIGH',
            suggestedTitle: 'Fraud complaint',
            suggestedDescription: 'Complaint of fraud from uploaded document.',
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    render(
      <LanguageProvider>
        <CitizenDashboard />
      </LanguageProvider>,
    )

    const fileInput = screen.getByLabelText('Upload complaint document for OCR')
    const file = new File(['test content'], 'complaint.txt', { type: 'text/plain' })

    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: /extract ocr/i }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/citizen/ocr/extract',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      )
    })

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter complaint title')).toHaveValue('Fraud complaint')
      expect(screen.getByPlaceholderText('Describe the incident in detail...')).toHaveValue('Complaint of fraud from uploaded document.')
      expect(screen.getByPlaceholderText('e.g. Vijay Nagar, Indore')).toHaveValue('Indore')
    })
  })
})
