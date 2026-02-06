import { useState, useEffect } from 'react'
import Tippy from '@tippyjs/react'
import { Link } from 'react-router-dom'
import { isMobile } from 'react-device-detect'
import { Genre } from '@/@types/common'
import Loading from './Loading'

type CardProps = {
  item: Genre
  index: number
}

const Card = (props: CardProps) => {
  const { item, index } = props
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const mangaLink = item.slug ? `/manga/${item.slug}` : '/manga'

  useEffect(() => {
    if (!mounted) return
    const id = setTimeout(() => {
      setLoading(false)
    }, 1000)
    return () => clearTimeout(id)
  }, [mounted])

  const onMount = () => setMounted(true)
  const onDestroy = () => setMounted(false)

  return (
    <div className="unit item-47969">
      <div className="inner">
        <Tippy
          arrow={false}
          duration={300}
          animation="fade"
          onMount={onMount}
          onHide={onDestroy}
          interactive={true}
          className="tippy-sidetip"
          placement={isMobile ? 'auto' : 'right'}
          content={<TooltipContent loading={loading} item={item} />}
        >
          <Link
            to={mangaLink}
            className="poster tooltipstered"
            data-tip="47969?/cache950"
          >
            <div>
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </Link>
        </Tippy>
        <div className="info">
          <div>
            <span className="type">{item.type}</span>
          </div>
          <Link to={mangaLink}>{item.title}</Link>
          <ul className="content" data-name="chap">
            {item.chapters.map((chap, index) => (
              <li key={index}>
                <Link to={chap.link || mangaLink}>
                  <span>
                    {chap.info} <b>{chap.lang}</b>
                  </span>
                  <span>{chap.date}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Card

type TooltipContentProps = {
  loading: boolean
  item: Genre
}

function TooltipContent(props: TooltipContentProps) {
  const { loading, item } = props
  const mangaLink = item.slug ? `/manga/${item.slug}` : '/manga'

  return (
    <div className="tippy-box" style={{ margin: 0, width: 320 }}>
      <div className="tippy-content">
        <Loading loading={loading} type="gif">
          <div className="bookmark">
            <div className="dropleft height-limit favourite" data-id={48347}>
              <button className="btn" type="button">
                <i className="fa-solid fa-circle-bookmark fa-xl" />
              </button>
              <div className="dropdown-menu dropdown-menu-right folders" />
            </div>
          </div>
          <span>{item.type}</span>
          <Link to={mangaLink}>{item.title}</Link>
          {item.chapters.length > 0 && (
            <p>{item.chapters[0].info}</p>
          )}
        </Loading>
      </div>
    </div>
  )
}
