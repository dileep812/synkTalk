function ActionButton({
  type = 'button',
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
}) {
  const baseClass = 'w-full rounded-xl px-4 py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-70'
  const variantClass =
    variant === 'secondary'
      ? 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-300 hover:text-cyan-700'
      : 'bg-slate-900 text-white hover:bg-slate-700'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass} ${className}`.trim()}
    >
      {children}
    </button>
  )
}

export default ActionButton
