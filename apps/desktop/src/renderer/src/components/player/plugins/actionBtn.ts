import { Plugin } from 'xgplayer'

export type PlayerToolbarAction = 'episodes' | 'sources' | 'mini'

type ActionBtnOptions = {
  pluginName: string
  text: string
  action: PlayerToolbarAction
  index?: number
  tip?: string
}

/** 在 xgplayer 控制栏右侧插入文字操作按钮 */
export function createActionBtnPlugin(opts: ActionBtnOptions) {
  const tip = opts.tip || opts.text
  const index = opts.index ?? 2

  return class ActionBtnPlugin extends Plugin {
    static get pluginName() {
      return opts.pluginName
    }

    static get defaultConfig() {
      return {
        position: Plugin.POSITIONS.CONTROLS_RIGHT,
        index,
        disable: false,
      }
    }

    private handler?: (e: Event) => void

    afterCreate() {
      if (this.config.disable) return
      this.handler = (e: Event) => {
        e.preventDefault()
        e.stopPropagation()
        this.player.emit('mxAction', opts.action as PlayerToolbarAction)
      }
      this.bind(['click', 'touchend'], this.handler)
    }

    destroy() {
      if (this.handler) this.unbind(['click', 'touchend'], this.handler)
    }

    render() {
      if (this.config.disable) return
      return `<xg-icon class="xgplayer-mx-action mx-action-${opts.action}" role="button" title="${tip}" aria-label="${tip}">
        <span class="mx-action-text">${opts.text}</span>
      </xg-icon>`
    }
  }
}

export const EpisodesBtnPlugin = createActionBtnPlugin({
  pluginName: 'mxEpisodes',
  text: '选集',
  action: 'episodes',
  index: 1,
  tip: '选择剧集',
})

export const SourcesBtnPlugin = createActionBtnPlugin({
  pluginName: 'mxSources',
  text: '换源',
  action: 'sources',
  index: 2,
  tip: '切换播放源',
})

export const MiniBtnPlugin = createActionBtnPlugin({
  pluginName: 'mxMini',
  text: '小屏',
  action: 'mini',
  index: 3,
  tip: '缩小为悬浮小窗',
})
