export type Genre = {
  image: string
  type: string
  title: string
  chapters: {
    info: string
    date: string
    lang: null
  }[]
}

export type GenreTrending = {
  image: string
  title: string
  desc: string
  releasing: string
  chapterAndVolume: string
  genres: string[]
}

export type Poster = {
  image: string
  title: string
  link?: string
}

export enum ENUM_READ_BY {
  CHAPTER = 'chapter',
  VOLUME = 'volume',
}
