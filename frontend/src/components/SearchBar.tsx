
type Props = {
  query: string
  onChange: (q: string) => void
  onSubmit?: () => void
}

export default function SearchBar({ query, onChange, onSubmit }: Props) {
  return (
    <form
      className="mb-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
    >
      <div className="input-group">
        <input
          className="form-control"
          placeholder="Enter words or phrase to find similar-tone songs..."
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Search</button>
      </div>
    </form>
  )
}
