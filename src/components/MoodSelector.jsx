import { moods } from '../utils/format.js'

export default function MoodSelector({ value, onChange }) {
  return (
    <div className="mood-options" role="group" aria-label="오늘의 기분">
      {moods.map((mood) => (
        <button
          key={mood.id}
          type="button"
          className={`mood-option ${value === mood.id ? 'is-selected' : ''}`}
          aria-pressed={value === mood.id}
          onClick={() => onChange(value === mood.id ? '' : mood.id)}
        >
          <span>{mood.emoji}</span><small>{mood.label}</small>
        </button>
      ))}
    </div>
  )
}