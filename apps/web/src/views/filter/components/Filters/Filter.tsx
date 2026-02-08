import { Genre, Language, Length, Sort, Status, Type, Year } from './components'

type FilterProps = {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  defaultSort?: string
}

const Filter = (props: FilterProps) => {
  const { handleSubmit, defaultSort } = props

  return (
    <form id="filters" autoComplete="off" onSubmit={handleSubmit}>
      <div>
        <div className="search">
          <input
            type="text"
            className="form-control"
            placeholder="Search..."
            name="keyword"
          />
        </div>
        <Type />
        <Genre />
        <Status />
        <Language />
        <Year />
        <Length />
        <Sort key={defaultSort} defaultSort={defaultSort} />
        <div>
          <button type="submit" className="btn btn-primary">
            <i className="fa-regular fa-circles-overlap fa-xs"></i>
            <span>Filter</span> <i className="ml-2 bi bi-intersect"></i>
          </button>
        </div>
      </div>
    </form>
  )
}

export default Filter
