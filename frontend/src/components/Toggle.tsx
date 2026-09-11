interface Props {
  checked: boolean;
  onChange: () => void;
}

export default function Toggle({ checked, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex items-center w-11 h-6 px-0.5 rounded-full transition-colors duration-200 flex-shrink-0 ${checked ? 'bg-primary' : 'bg-line-strong'}`}
    >
      <span
        className={`w-5 h-5 rounded-full flex-shrink-0 transition-all duration-200 ${checked ? 'ml-auto bg-canvas' : 'bg-fg-faint'}`}
      />
    </button>
  );
}
