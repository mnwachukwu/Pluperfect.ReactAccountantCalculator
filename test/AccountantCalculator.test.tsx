import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AccountantCalculator } from '../src/AccountantCalculator.tsx'

const value = () => screen.getByRole('status')

function Host({ onResult }: { onResult?: (value: string, expression: string) => void }) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)}>Toggle</button>
      <input aria-label="Notes" />
      <p>Page text</p>
      <AccountantCalculator open={open} onOpenChange={setOpen} locale="en-US" {...(onResult ? { onResult } : {})} />
    </>
  )
}

describe('AccountantCalculator', () => {
  it('is called Calculator and starts at 0.00', () => {
    render(<Host />)
    expect(screen.getByRole('dialog', { name: 'Calculator' })).toBeInTheDocument()
    expect(value()).toHaveTextContent('0.00')
  })

  it('works out a sum from its buttons and reports it as decimal text', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(<Host onResult={onResult} />)
    for (const name of ['1', '0', '0', 'Add', '5', 'Percent', 'Equals']) {
      await user.click(screen.getByRole('button', { name }))
    }
    expect(value()).toHaveTextContent('105.00')
    expect(onResult).toHaveBeenCalledWith('105.00', '100.00 + 5.00')
  })

  it('takes the keyboard anywhere on the page', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.click(document.body)
    await user.keyboard('12*3{Enter}')
    expect(value()).toHaveTextContent('36.00')
    await user.keyboard('{Escape}')
    expect(value()).toHaveTextContent('0.00')
  })

  it('leaves the keyboard to a text field that has focus', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.click(screen.getByRole('textbox', { name: 'Notes' }))
    await user.keyboard('42')
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('42')
    expect(value()).toHaveTextContent('0.00')
  })

  it('deletes one digit with Backspace', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('12+345{Backspace}{Enter}')
    expect(value()).toHaveTextContent('46.00')
  })

  it('clears the entry with its CE button', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('12+34')
    await user.click(screen.getByRole('button', { name: 'Clear entry' }))
    await user.keyboard('5{Enter}')
    expect(value()).toHaveTextContent('17.00')
  })

  it('keeps a memory, and marks it on the screen', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('50')
    await user.click(screen.getByRole('button', { name: 'Memory add' }))
    await user.keyboard('{Escape}25')
    await user.click(screen.getByRole('button', { name: 'Memory add' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Memory recall' }))
    expect(value()).toHaveTextContent('75.00')
    expect(screen.getByTitle('A number is in memory')).toHaveTextContent('M')
  })

  it('takes the memory keys from M held with another key', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('50{m>}+{/m}{Escape}25{m>}+{/m}{Escape}{m>}r{/m}')
    expect(value()).toHaveTextContent('75.00')
    await user.keyboard('+5{Enter}')
    expect(value()).toHaveTextContent('80.00')
  })

  it('shows a key pressed from the keyboard as pressed, for a moment', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('7')
    expect(screen.getByRole('button', { name: '7' })).toHaveClass('pac-key-pressed')
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)))
    expect(screen.getByRole('button', { name: '7' })).not.toHaveClass('pac-key-pressed')
  })

  it('copies what the display shows', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('1234.5*2{Enter}')
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await navigator.clipboard.readText()).toBe('2,469.00')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('copies its value on Ctrl+C, unless text on the page is selected', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('12*3{Enter}')
    const setData = vi.fn()
    fireEvent.copy(document.body, { clipboardData: { setData } })
    expect(setData).toHaveBeenCalledWith('text/plain', '36.00')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()

    setData.mockClear()
    document.getSelection()?.selectAllChildren(screen.getByText('Page text'))
    fireEvent.copy(document.body, { clipboardData: { setData } })
    expect(setData).not.toHaveBeenCalled()
  })

  it('takes a pasted number, rounded to cents, and ignores anything else', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.paste('hello')
    expect(value()).toHaveTextContent('0.00')
    await user.paste('$1,234.567')
    expect(value()).toHaveTextContent('1,234.57')
    await user.keyboard('+1{Enter}')
    expect(value()).toHaveTextContent('1,235.57')
  })

  it('leaves a paste into a text field to the field', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.click(screen.getByRole('textbox', { name: 'Notes' }))
    await user.paste('42')
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveValue('42')
    expect(value()).toHaveTextContent('0.00')
  })

  it('closes with its own button and keeps its number when opened again', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.keyboard('7')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.keyboard('9')
    await user.click(screen.getByRole('button', { name: 'Toggle' }))
    expect(screen.getByRole('dialog')).toBeVisible()
    expect(value()).toHaveTextContent('7.00')
  })

  it('gives every button a tooltip', () => {
    render(<Host />)
    for (const button of screen.getByRole('dialog').querySelectorAll('button')) {
      expect(button.title.trim()).not.toBe('')
    }
  })
})
