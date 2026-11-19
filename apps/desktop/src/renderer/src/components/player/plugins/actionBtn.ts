import { Plugin } from 'xgplayer'

export type PlayerToolbarAction = 'mini'

export type PlayerEpisodeOption = {
  index: number
  name: string
}

export type PlayerSourceOption = {
  sourceKey: string
  vodId: string
  sourceName: string
  current?: boolean
  remarks?: string
}

type MenuItem = {
  id: string
  label: string
  meta?: string
  active?: boolean
  disabled?: boolean
}

type MenuBtnOptions = {
  pluginName: string
  text: string
  tip?: string
  index?: number
  /** 选中后向 player 抛出的事件名 */
  selectEvent: string
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 控制栏悬停向上弹出的菜单按钮（选集 / 换源） */
export function createMenuBtnPlugin(opts: MenuBtnOptions) {
  const tip = opts.tip || opts.text
  const index = opts.index ?? 2

  return class MenuBtnPlugin extends Plugin {
    static get pluginName() {
      return opts.pluginName
    }

    static get defaultConfig() {
      return {
        position: Plugin.POSITIONS.CONTROLS_RIGHT,
        index,
        disable: false,
        list: [] as MenuItem[],
      }
    }

    private items: MenuItem[] = []
    private leaveTimer: ReturnType<typeof setTimeout> | null = null
    private onEnter?: (e: Event) => void
    private onLeave?: (e: Event) => void
    private onPanelEnter?: () => void
    private onPanelLeave?: () => void
    private onPanelClick?: (e: Event) => void
    private onToggle?: (e: Event) => void

    afterCreate() {
      if (this.config.disable) return
      this.items = Array.isArray(this.config.list) ? [...this.config.list] : []
      this.renderList()

      this.onEnter = () => {
        this.clearLeave()
        this.open()
      }
      this.onLeave = () => {
        this.scheduleClose()
      }
      this.onPanelEnter = () => {
        this.clearLeave()
        this.open()
      }
      this.onPanelLeave = () => {
        this.scheduleClose()
      }
      this.onToggle = (e: Event) => {
        const target = e.target as HTMLElement | null
        if (target?.closest?.('.mx-menu-panel')) return
        e.preventDefault()
        e.stopPropagation()
        if (this.root?.classList.contains('is-open')) this.close()
        else this.open()
      }
      this.onPanelClick = (e: Event) => {
        const target = e.target as HTMLElement | null
        const btn = target?.closest?.('.mx-menu-item') as HTMLElement | null
        if (!btn || btn.classList.contains('is-disabled')) return
        e.preventDefault()
        e.stopPropagation()
        const id = btn.getAttribute('data-id') || ''
        const item = this.items.find((it) => it.id === id)
        if (!item || item.disabled) return
        this.player.emit(opts.selectEvent, item)
        this.close()
      }

      this.bind('mouseenter', this.onEnter)
      this.bind('mouseleave', this.onLeave)
      this.bind(['click', 'touchend'], this.onToggle)
      const panel = this.find('.mx-menu-panel')
      if (panel) {
        panel.addEventListener('mouseenter', this.onPanelEnter)
        panel.addEventListener('mouseleave', this.onPanelLeave)
        panel.addEventListener('click', this.onPanelClick)
      }
    }

    /** 外部刷新菜单数据 */
    updateList(list: MenuItem[]) {
      this.items = Array.isArray(list) ? [...list] : []
      this.config.list = this.items
      this.renderList()
    }

    private renderList() {
      const body = this.find('.mx-menu-body')
      if (!body) return
      if (!this.items.length) {
        body.innerHTML = `<div class="mx-menu-empty">暂无选项</div>`
        return
      }
      body.innerHTML = this.items
        .map((item) => {
          const cls = [
            'mx-menu-item',
            item.active ? 'is-active' : '',
            item.disabled ? 'is-disabled' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const meta = item.meta
            ? `<em class="mx-menu-meta">${escapeHtml(item.meta)}</em>`
            : ''
          return `<button type="button" class="${cls}" data-id="${escapeHtml(item.id)}" ${
            item.disabled ? 'disabled' : ''
          }><span>${escapeHtml(item.label)}</span>${meta}</button>`
        })
        .join('')
    }

    private open() {
      this.root?.classList.add('is-open')
      // 菜单伸到控制栏上方时，保持控制栏不自动收起
      this.player?.controls?.focus?.()
    }

    private close() {
      this.root?.classList.remove('is-open')
    }

    private scheduleClose() {
      this.clearLeave()
      this.leaveTimer = setTimeout(() => this.close(), 120)
    }

    private clearLeave() {
      if (this.leaveTimer) {
        clearTimeout(this.leaveTimer)
        this.leaveTimer = null
      }
    }

    destroy() {
      this.clearLeave()
      if (this.onEnter) this.unbind('mouseenter', this.onEnter)
      if (this.onLeave) this.unbind('mouseleave', this.onLeave)
      if (this.onToggle) this.unbind(['click', 'touchend'], this.onToggle)
      const panel = this.find('.mx-menu-panel')
      if (panel) {
        if (this.onPanelEnter) panel.removeEventListener('mouseenter', this.onPanelEnter)
        if (this.onPanelLeave) panel.removeEventListener('mouseleave', this.onPanelLeave)
        if (this.onPanelClick) panel.removeEventListener('click', this.onPanelClick)
      }
    }

    render() {
      if (this.config.disable) return
      return `<xg-icon class="xgplayer-mx-action xgplayer-mx-menu mx-action-menu" role="button" title="${tip}" aria-label="${tip}">
        <span class="mx-action-text">${opts.text}</span>
        <div class="mx-menu-panel" role="listbox" aria-label="${tip}">
          <div class="mx-menu-body"></div>
        </div>
      </xg-icon>`
    }
  }
}

export const EpisodesBtnPlugin = createMenuBtnPlugin({
  pluginName: 'mxEpisodes',
  text: '选集',
  tip: '选择剧集',
  index: 1,
  selectEvent: 'mxSelectEpisode',
})

export const SourcesBtnPlugin = createMenuBtnPlugin({
  pluginName: 'mxSources',
  text: '换源',
  tip: '切换播放源',
  index: 2,
  selectEvent: 'mxSelectSource',
})

/** 小屏仍用点击按钮 */
export function createActionBtnPlugin(opts: {
  pluginName: string
  text: string
  action: PlayerToolbarAction
  index?: number
  tip?: string
}) {
  const tip = opts.tip || opts.text
  const index = opts.index ?? 3

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
        this.player.emit('mxAction', opts.action)
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

export const MiniBtnPlugin = createActionBtnPlugin({
  pluginName: 'mxMini',
  text: '小屏',
  action: 'mini',
  index: 3,
  tip: '缩小为悬浮小窗',
})

export function toEpisodeMenuItems(
  episodes: PlayerEpisodeOption[],
  activeIndex: number,
) {
  return episodes.map((ep) => ({
    id: String(ep.index),
    label: ep.name || `第 ${ep.index + 1} 集`,
    active: ep.index === activeIndex,
  }))
}

export function toSourceMenuItems(sources: PlayerSourceOption[]) {
  return sources.map((s) => ({
    id: `${s.sourceKey}::${s.vodId}`,
    label: s.current ? `${s.sourceName} · 当前` : s.sourceName,
    meta: s.remarks || undefined,
    active: Boolean(s.current),
    disabled: Boolean(s.current),
  }))
}
