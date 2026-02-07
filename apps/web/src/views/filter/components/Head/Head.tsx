type HeadProps = {
  title?: string
  count?: number
}

const Head = ({ title = 'Filter', count }: HeadProps) => {
  const formatted = count !== undefined ? count.toLocaleString() : ''
  return (
    <div className="head">
      <h2>{title}</h2>
      {formatted && <span>{formatted} mangas</span>}
    </div>
  )
}

export default Head
