import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import './Select.css'

export interface SelectOption<T extends string | number> {
  value: T
  label: string
}

interface SelectProps<T extends string | number> {
  value: T
  options: ReadonlyArray<SelectOption<T>>
  onChange: (value: T) => void
  ariaLabel: string
  variant?: 'compact' | 'field'
  className?: string
  disabled?: boolean
}

interface MenuPosition {
  left: number
  top?: number
  bottom?: number
  minWidth: number
  width?: number
}

const MENU_MAX_HEIGHT = 280
const MENU_ITEM_HEIGHT = 34
const MENU_GAP = 6

export default function Select<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  variant = 'field',
  className,
  disabled = false,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const baseId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : ''

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    setPosition(null)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  const openMenu = useCallback((preferLast: boolean) => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuHeight = Math.min(MENU_MAX_HEIGHT, options.length * MENU_ITEM_HEIGHT + 12)
    const openUp = rect.bottom + menuHeight + MENU_GAP > window.innerHeight && rect.top > menuHeight + MENU_GAP
    const desiredWidth = variant === 'field' ? rect.width : Math.max(rect.width, 128)
    const width = Math.min(desiredWidth, window.innerWidth - 16)
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8)

    setPosition(
      openUp
        ? { left, bottom: window.innerHeight - rect.top + MENU_GAP, minWidth: width, width }
        : { left, top: rect.bottom + MENU_GAP, minWidth: width, width },
    )
    setActiveIndex(preferLast ? options.length - 1 : selectedIndex >= 0 ? selectedIndex : 0)
    setOpen(true)
  }, [options.length, selectedIndex, variant])

  const commit = useCallback((index: number) => {
    const option = options[index]
    if (!option) return
    if (option.value !== value) onChange(option.value)
    closeMenu(true)
  }, [closeMenu, onChange, options, value])

  // 点击外部、页面滚动或窗口缩放时关闭
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      closeMenu(false)
    }
    const handleViewportChange = () => closeMenu(false)

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('scroll', handleViewportChange, true)
    window.addEventListener('resize', handleViewportChange)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('scroll', handleViewportChange, true)
      window.removeEventListener('resize', handleViewportChange)
    }
  }, [closeMenu, open])

  // 保证键盘高亮的选项始终在可视区域内
  useEffect(() => {
    if (!open) return
    const items = menuRef.current?.querySelectorAll<HTMLElement>('.owen-select-option')
    items?.[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    const { key } = event

    if (!open) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        openMenu(key === 'ArrowUp')
      }
      return
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      const delta = key === 'ArrowDown' ? 1 : -1
      setActiveIndex((index) => (index + delta + options.length) % options.length)
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault()
      setActiveIndex(key === 'Home' ? 0 : options.length - 1)
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      commit(activeIndex)
    } else if (key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMenu(true)
    } else if (key === 'Tab') {
      closeMenu(false)
    }
  }

  return (
    <div className={`owen-select owen-select--${variant}${className ? ` ${className}` : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="owen-select-trigger"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${baseId}-listbox` : undefined}
        aria-activedescendant={open ? `${baseId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => {
          if (open) closeMenu(true)
          else openMenu(false)
        }}
        onKeyDown={handleKeyDown}
      >
        <span className="owen-select-value">{selectedLabel}</span>
        <ChevronDown className="owen-select-chevron" size={14} aria-hidden="true" />
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          id={`${baseId}-listbox`}
          className={`owen-select-menu${variant === 'compact' ? ' owen-select-menu--compact' : ''}`}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            left: position.left,
            top: position.top,
            bottom: position.bottom,
            minWidth: position.minWidth,
            width: position.width,
          }}
          onPointerDown={(event) => event.preventDefault()}
        >
          {options.map((option, index) => (
            <div
              key={String(option.value)}
              id={`${baseId}-option-${index}`}
              className={`owen-select-option${index === activeIndex ? ' is-active' : ''}`}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              <span>{option.label}</span>
              <Check className="owen-select-check" size={14} aria-hidden="true" />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
}
