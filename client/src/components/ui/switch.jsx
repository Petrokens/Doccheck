import * as React from 'react'
import { Switch as HeadlessSwitch } from '@headlessui/react'
import { cn } from '@/lib/utils' // Make sure you have this utility

export function Switch({ checked, onCheckedChange }) {
  return (
    <HeadlessSwitch
      checked={checked}
      onChange={onCheckedChange}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-violet-600' : 'bg-gray-400'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </HeadlessSwitch>
  )
}
