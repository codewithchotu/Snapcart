'use client'
import { useTheme } from '@/context/ThemeContext'
import { Moon, Sun } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      className='relative bg-white dark:bg-gray-800 rounded-full w-11 h-11 flex items-center justify-center shadow-md hover:scale-105 transition-transform border border-gray-200 dark:border-gray-700 overflow-hidden'
    >
      <AnimatePresence mode='wait' initial={false}>
        {theme === 'light' ? (
          <motion.span
            key='moon'
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25 }}
            className='absolute'
          >
            <Moon className='w-5 h-5 text-gray-700' />
          </motion.span>
        ) : (
          <motion.span
            key='sun'
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.25 }}
            className='absolute'
          >
            <Sun className='w-5 h-5 text-yellow-400' />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
