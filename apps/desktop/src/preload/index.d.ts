import type { MyMovieAPI } from './index'

export {}

declare global {
  interface Window {
    myMovie: MyMovieAPI
  }
}
