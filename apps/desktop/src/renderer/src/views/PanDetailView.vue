<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpin, useMessage } from 'naive-ui'
import { fetchPanDetail, fetchPanShareUrl } from '@/api/pan'
import type { PanDetail } from '@my-movie/shared'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const resolving = ref(false)
const detail = ref<PanDetail | null>(null)
const id = computed(() => String(route.params.id || ''))

async function load() {
  loading.value = true
  try {
    detail.value = await fetchPanDetail(id.value)
  } catch (err) {
    detail.value = null
    message.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function playFile(fileName?: string) {
  if (!detail.value) return
  if (!window.myMovie?.panResolvePlay) {
    message.error('请在桌面端使用网盘播放')
    return
  }
  resolving.value = true
  try {
    const { url } = await fetchPanShareUrl(detail.value.id)
    const kind = /quark/i.test(detail.value.panType) || /pan\.quark/i.test(url) ? 'quark' : 'baidu'
    if (kind === 'quark') {
      const ok = await window.myMovie.quarkEnsureLogin()
      if (!ok) throw new Error('未完成夸克登录')
    } else {
      const ok = await window.myMovie.baiduEnsureLogin()
      if (!ok) throw new Error('未完成百度登录')
    }
    const resolved = await window.myMovie.panResolvePlay({
      shareUrl: url,
      preferName: fileName,
    })
    sessionStorage.setItem(
      'pan-play',
      JSON.stringify({
        title: detail.value.title,
        fileName: resolved.fileName,
        playUrl: resolved.playUrl,
        kind: resolved.kind,
        panId: detail.value.id,
      }),
    )
    router.push({
      path: `/pan-play/${detail.value.id}`,
      query: { file: resolved.fileName },
    })
  } catch (err) {
    message.error(err instanceof Error ? err.message : '解析播放失败')
  } finally {
    resolving.value = false
  }
}

watch(id, load, { immediate: true })
</script>

<template>
  <NSpin :show="loading || resolving">
    <div v-if="detail" class="wrap">
      <div class="head">
        <div class="badge">{{ detail.sourceName }}</div>
        <h1>{{ detail.title }}</h1>
        <p v-if="detail.description">{{ detail.description }}</p>
        <div class="actions">
          <NButton type="primary" :loading="resolving" @click="playFile()">
            播放（自动选视频）
          </NButton>
          <NButton quaternary @click="router.back()">返回</NButton>
        </div>
      </div>

      <section class="files">
        <h2>视频文件</h2>
        <div v-if="detail.videos.length" class="list">
          <button
            v-for="name in detail.videos"
            :key="name"
            type="button"
            class="file"
            @click="playFile(name)"
          >
            {{ name }}
          </button>
        </div>
        <pre v-else class="menu">{{ detail.menu || '暂无目录信息' }}</pre>
      </section>
    </div>
  </NSpin>
</template>

<style scoped lang="scss">
.wrap {
  max-width: 960px;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}

h1 {
  margin: 12px 0 8px;
}

p {
  color: var(--text-muted);
  max-width: 68ch;
  line-height: 1.65;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.files {
  margin-top: var(--space-6);
}

h2 {
  margin: 0 0 12px;
}

.list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file {
  border: 0;
  background: var(--bg-soft);
  color: var(--text-muted);
  border-radius: var(--radius-pill);
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 700;
  font-size: 12px;
  transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.file:hover {
  background: var(--bg-hover);
  color: var(--text);
  transform: scale(1.02);
}

.menu {
  white-space: pre-wrap;
  background: var(--bg-elevated);
  border: 0;
  border-radius: var(--radius);
  padding: 14px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  max-height: 420px;
  overflow: auto;
  box-shadow: var(--inset-border);
}
</style>
