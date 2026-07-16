import styles from './SegmentedControl.module.css';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  function onKeyDown(event: KeyboardEvent): void {
    const index = options.findIndex((option) => option.value === value);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = index + 1;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index - 1;
    if (next === -1) return;
    event.preventDefault();
    const option = options[(next + options.length) % options.length];
    if (option) {
      onChange(option.value);
      const group = (event.currentTarget as HTMLElement).parentElement;
      const radios = group?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      radios?.[(next + options.length) % options.length]?.focus();
    }
  }

  return (
    <div class={styles.group} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          class={styles.option}
          role="radio"
          aria-checked={option.value === value}
          tabIndex={option.value === value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={onKeyDown}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
