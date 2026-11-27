import { describe, expect, it } from 'vitest'
import {
  calculateOutputDimensions,
  getOutputFileName,
  getUniqueFileName,
  resolveOutputType,
  shouldKeepOriginal,
} from './imageUtils'

describe('calculateOutputDimensions', () => {
  it('按宽高上限等比例缩小', () => {
    expect(calculateOutputDimensions(1600, 900, {
      maxWidth: 800,
      maxHeight: 600,
      keepAspectRatio: true,
    })).toEqual({ width: 800, height: 450 })
  })

  it('仅设置高度时按比例计算宽度', () => {
    expect(calculateOutputDimensions(1200, 800, {
      maxHeight: 400,
      keepAspectRatio: true,
    })).toEqual({ width: 600, height: 400 })
  })

  it('不放大原始图片', () => {
    expect(calculateOutputDimensions(640, 480, {
      maxWidth: 1280,
      maxHeight: 960,
      keepAspectRatio: true,
    })).toEqual({ width: 640, height: 480 })
  })

  it('未设置尺寸上限时保留原始尺寸', () => {
    expect(calculateOutputDimensions(640, 480, {
      keepAspectRatio: true,
    })).toEqual({ width: 640, height: 480 })
  })

  it('关闭宽高比后分别限制宽和高', () => {
    expect(calculateOutputDimensions(1600, 900, {
      maxWidth: 800,
      maxHeight: 600,
      keepAspectRatio: false,
    })).toEqual({ width: 800, height: 600 })
  })

  it('非等比例模式下未设置的轴保持不变', () => {
    expect(calculateOutputDimensions(1600, 900, {
      maxWidth: 800,
      keepAspectRatio: false,
    })).toEqual({ width: 800, height: 900 })
  })

  it('拒绝无效的原始尺寸', () => {
    expect(() => calculateOutputDimensions(0, 100, {
      keepAspectRatio: true,
    })).toThrow('原始图片尺寸必须大于 0')
  })
})

describe('图片输出格式', () => {
  it('保持原格式', () => {
    expect(resolveOutputType('image/jpeg', 'original')).toBe('image/jpeg')
    expect(resolveOutputType('image/png', 'original')).toBe('image/png')
    expect(resolveOutputType('image/webp', 'original')).toBe('image/webp')
  })

  it('转换为指定格式', () => {
    expect(resolveOutputType('image/png', 'image/jpeg')).toBe('image/jpeg')
    expect(resolveOutputType('image/jpeg', 'image/webp')).toBe('image/webp')
  })

  it('拒绝不支持的原始格式', () => {
    expect(() => resolveOutputType('image/gif', 'original')).toThrow('无法识别原始图片格式')
  })
})

describe('输出文件名', () => {
  it('保留原始文件名并替换扩展名', () => {
    expect(getOutputFileName('holiday.photo.PNG', 'image/webp')).toBe('holiday.photo-processed.webp')
    expect(getOutputFileName('avatar', 'image/jpeg')).toBe('avatar-processed.jpg')
  })

  it('统一 JPEG 扩展名', () => {
    expect(getOutputFileName('photo.jpeg', 'image/jpeg')).toBe('photo-processed.jpg')
  })

  it('避免批量下载时重名覆盖', () => {
    const usedNames = new Set(['photo-processed.jpg'])
    expect(getUniqueFileName('photo-processed.jpg', usedNames)).toBe('photo-processed-2.jpg')
    expect(getUniqueFileName('other-processed.jpg', usedNames)).toBe('other-processed.jpg')
  })
})

describe('是否保留原图', () => {
  const size = { width: 800, height: 600 }

  it('同格式同尺寸且输出更大时保留原图', () => {
    expect(shouldKeepOriginal(1000, 1200, size, size, 'image/jpeg', 'image/jpeg')).toBe(true)
  })

  it('输出体积与原图相同时保留原图', () => {
    expect(shouldKeepOriginal(1000, 1000, size, size, 'image/png', 'image/png')).toBe(true)
  })

  it('输出更小时使用处理结果', () => {
    expect(shouldKeepOriginal(1000, 800, size, size, 'image/jpeg', 'image/jpeg')).toBe(false)
  })

  it('尺寸或格式变化时使用处理结果', () => {
    expect(shouldKeepOriginal(1000, 1200, size, { width: 400, height: 300 }, 'image/jpeg', 'image/jpeg')).toBe(false)
    expect(shouldKeepOriginal(1000, 1200, size, size, 'image/png', 'image/jpeg')).toBe(false)
  })
})
