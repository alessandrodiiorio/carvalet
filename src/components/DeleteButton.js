'use client'

export default function DeleteButton({ message = 'Sei sicuro?', children = 'Elimina' }) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault()
      }}
      className="rounded-lg border border-red-300 bg-white text-red-700 text-sm font-medium px-3 py-2 hover:bg-red-50"
    >
      {children}
    </button>
  )
}
