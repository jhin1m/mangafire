import { Link } from 'react-router-dom'

type TrendingItem = {
  slug: string
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: { name: string; slug: string }[]
}

type TrendingCardProps = {
  item: TrendingItem
  index: number
}

function TrendingCard(props: TrendingCardProps) {
  const { item, index } = props
  return (
    <div className="swiper-inner">
      <div className="bookmark">
        <div className="dropleft width-limit favourite" data-id="63">
          <button
            className="btn"
            data-toggle="dropdown"
            data-placeholder="false"
          >
            <i className="fa-solid fa-circle-bookmark"></i>
          </button>
          <div className="dropdown-menu dropdown-menu-right folders"></div>
        </div>
      </div>
      <div className="info">
        <div className="above">
          <span>{item.releasing}</span>
          <Link className="unit" to={`/manga/${item.slug}`}>
            {item.title}
          </Link>
        </div>
        <div className="below">
          <span>{item.desc}</span>
          <p>{item.chapterAndVolume}</p>
          <div>
            {item.genres.map((genre) => (
              <Link key={genre.slug} to={`/genre/${genre.slug}`}>
                {genre.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Link to={`/manga/${item.slug}`} className="poster">
        <div>
          <img src={item.image} alt={item.title} />
        </div>
      </Link>
    </div>
  )
}

export default TrendingCard
