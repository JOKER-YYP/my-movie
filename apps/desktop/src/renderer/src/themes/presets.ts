import type { GlobalThemeOverrides } from 'naive-ui'

export type ThemeId = 'spotify' | 'cinema' | 'dusk' | 'daylight'

export type ThemePreset = {
  id: ThemeId
  label: string
  blurb: string
  mode: 'dark' | 'light'
  swatch: [string, string, string]
  naive: GlobalThemeOverrides
}

const fontFamily = "'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif"

function darkNaive(accent: string, accentHover: string, accentPressed: string, onAccent = '#000000'): GlobalThemeOverrides {
  return {
    common: {
      primaryColor: accent,
      primaryColorHover: accentHover,
      primaryColorPressed: accentPressed,
      primaryColorSuppl: accent,
      bodyColor: '#121212',
      cardColor: '#181818',
      modalColor: '#181818',
      popoverColor: '#1f1f1f',
      borderColor: '#4d4d4d',
      dividerColor: '#4d4d4d',
      textColorBase: '#ffffff',
      textColor1: '#ffffff',
      textColor2: '#b3b3b3',
      textColor3: '#7c7c7c',
      borderRadius: '8px',
      fontFamily,
    },
    Button: {
      borderRadiusMedium: '9999px',
      borderRadiusLarge: '9999px',
      heightMedium: '36px',
      heightLarge: '42px',
      fontWeightStrong: '700',
      textColorPrimary: onAccent,
      textColorHoverPrimary: onAccent,
      textColorPressedPrimary: onAccent,
      textColorFocusPrimary: onAccent,
    },
    Input: {
      borderRadius: '9999px',
      heightMedium: '40px',
      color: '#1f1f1f',
      colorFocus: '#1f1f1f',
    },
    Card: {
      borderRadius: '8px',
      paddingMedium: '16px 20px',
      color: '#181818',
    },
    Tabs: {
      tabTextColorActiveLine: '#ffffff',
      tabTextColorHoverLine: '#ffffff',
      barColor: accent,
    },
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'spotify',
    label: '翠绿暗场',
    blurb: '近黑底 + 功能绿，内容优先',
    mode: 'dark',
    swatch: ['#121212', '#1ed760', '#181818'],
    naive: darkNaive('#1ed760', '#1fdf64', '#1db954'),
  },
  {
    id: 'cinema',
    label: '青映影院',
    blurb: '冷青强调，偏长视频桌面感',
    mode: 'dark',
    swatch: ['#0a0c11', '#1ad0ff', '#121722'],
    naive: {
      ...darkNaive('#1ad0ff', '#4ddbff', '#00b4e0', '#041018'),
      common: {
        ...darkNaive('#1ad0ff', '#4ddbff', '#00b4e0', '#041018').common,
        bodyColor: '#0a0c11',
        cardColor: '#121722',
        modalColor: '#121722',
        popoverColor: '#181f2d',
        borderColor: '#2a3548',
        dividerColor: '#2a3548',
        textColorBase: '#eef3fa',
        textColor1: '#eef3fa',
        textColor2: '#9aa8bd',
        textColor3: '#6f7d93',
      },
      Input: {
        borderRadius: '9999px',
        heightMedium: '40px',
        color: '#181f2d',
        colorFocus: '#1e2738',
      },
      Card: {
        borderRadius: '12px',
        paddingMedium: '16px 20px',
        color: '#121722',
      },
    },
  },
  {
    id: 'dusk',
    label: '暮色琥珀',
    blurb: '暖琥珀点缀的深色观影',
    mode: 'dark',
    swatch: ['#14110f', '#ffb347', '#1c1814'],
    naive: {
      ...darkNaive('#ffb347', '#ffc266', '#e09a2f', '#1a1208'),
      common: {
        ...darkNaive('#ffb347', '#ffc266', '#e09a2f', '#1a1208').common,
        bodyColor: '#14110f',
        cardColor: '#1c1814',
        modalColor: '#1c1814',
        popoverColor: '#241f1a',
        borderColor: '#3d342c',
        dividerColor: '#3d342c',
        textColorBase: '#f7f0e8',
        textColor1: '#f7f0e8',
        textColor2: '#b8a99a',
        textColor3: '#8a7b6c',
      },
      Input: {
        borderRadius: '9999px',
        heightMedium: '40px',
        color: '#241f1a',
        colorFocus: '#2e2720',
      },
      Card: {
        borderRadius: '8px',
        paddingMedium: '16px 20px',
        color: '#1c1814',
      },
    },
  },
  {
    id: 'daylight',
    label: '日间浅色',
    blurb: '浅底深字，白天浏览更轻松',
    mode: 'light',
    swatch: ['#f6f7f8', '#1db954', '#ffffff'],
    naive: {
      common: {
        primaryColor: '#1db954',
        primaryColorHover: '#1ed760',
        primaryColorPressed: '#169c46',
        primaryColorSuppl: '#1db954',
        bodyColor: '#f6f7f8',
        cardColor: '#ffffff',
        modalColor: '#ffffff',
        popoverColor: '#ffffff',
        borderColor: '#dde1e6',
        dividerColor: '#dde1e6',
        textColorBase: '#121212',
        textColor1: '#121212',
        textColor2: '#535353',
        textColor3: '#7a7a7a',
        borderRadius: '8px',
        fontFamily,
      },
      Button: {
        borderRadiusMedium: '9999px',
        borderRadiusLarge: '9999px',
        heightMedium: '36px',
        heightLarge: '42px',
        fontWeightStrong: '700',
        textColorPrimary: '#ffffff',
        textColorHoverPrimary: '#ffffff',
        textColorPressedPrimary: '#ffffff',
        textColorFocusPrimary: '#ffffff',
      },
      Input: {
        borderRadius: '9999px',
        heightMedium: '40px',
        color: '#ffffff',
        colorFocus: '#ffffff',
      },
      Card: {
        borderRadius: '8px',
        paddingMedium: '16px 20px',
        color: '#ffffff',
      },
      Tabs: {
        tabTextColorActiveLine: '#121212',
        tabTextColorHoverLine: '#121212',
        barColor: '#1db954',
      },
    },
  },
]

export const DEFAULT_THEME: ThemeId = 'spotify'
export const THEME_STORAGE_KEY = 'uiTheme'

export function isThemeId(v: string | null | undefined): v is ThemeId {
  return THEME_PRESETS.some((t) => t.id === v)
}

export function getThemePreset(id: ThemeId): ThemePreset {
  return THEME_PRESETS.find((t) => t.id === id) || THEME_PRESETS[0]
}

export function applyDocumentTheme(id: ThemeId) {
  document.documentElement.setAttribute('data-theme', id)
}

export function readStoredTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(raw)) return raw
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME
}
