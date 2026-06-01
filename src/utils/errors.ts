/** 将模型 SDK 抛出的错误归一为可读中文提示 */
export function normalizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const status = (err as { status?: number })?.status
  if (status === 401 || /api key|unauthorized|invalid.*key/i.test(msg))
    return "API Key 无效或已过期，请在设置中检查。"
  if (status === 429 || /rate limit|quota/i.test(msg))
    return "请求过于频繁或额度不足，请稍后再试。"
  if (/invalid.*base64.*image_url|image_url.*base64/i.test(msg))
    return "这张图片的地址格式暂不支持，请换网页中的 JPG/PNG/WebP 图片再试。"
  if (/timeout while downloading url|while downloading url/i.test(msg))
    return "模型无法读取这张网页图片，可能是图片服务器限制访问或加载超时。请换网页中的 JPG/PNG/WebP 图片再试。"
  if (/network|fetch failed|failed to fetch/i.test(msg))
    return "网络请求失败，请检查网络连接。"
  return msg
}
