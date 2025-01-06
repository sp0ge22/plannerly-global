import { ChevronDownIcon } from '@heroicons/react/24/outline'

interface ChevronButtonProps {
  onClick: () => void
}

export default function ChevronButton({ onClick }: ChevronButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce"
      aria-label="Scroll to next section"
    >
      <ChevronDownIcon className="h-8 w-8 text-gray-600 hover:text-gray-800 transition-colors" />
    </button>
  )
} 