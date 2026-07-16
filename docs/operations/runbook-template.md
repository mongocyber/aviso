# Runbook：[告警或系统名称]

Status: `template`
Updated: 2026-07-10
Runbook status: `draft | active | deprecated`
Owner: [填写 owner]
Last reviewed: [YYYY-MM-DD]

## 触发条件

- Signal：[商店后台 / 支持反馈 / Vercel / 后端 alert]
- Threshold：[持续时间、影响范围或明确条件]
- Severity：`SEV1 | SEV2 | SEV3`

## 症状与影响

- 用户可见表现：[错误、不可用、误导文案或隐私风险]
- 受影响版本/路径：[填写]
- 数据风险：`none | possible | confirmed`
- 可用 workaround：[填写或 none]

## 诊断

1. 确认当前 commit、扩展版本、官网部署和最近变更。
2. 区分扩展、BYOK provider、官网、商店流程和 hosted AI 后端问题。
3. 只收集脱敏证据；不得复制 API Key、token、prompt、response、页面正文、完整 URL 或截图内容。
4. 达到事故标准时进入 [`incident-response.md`](./incident-response.md)。

## 止血

- 首选动作：[停止提交 / 停止放量 / 回退官网 / 禁用受影响路径 / 转后端 runbook]
- Owner gate：[批准人或批准链接]
- 预期效果：[填写]

## 恢复与验证

1. 执行最小修复或回退，不在事故中扩大 scope。
2. 运行 [`../architecture/testing.md`](../architecture/testing.md) 对应检查。
3. 验证核心用户路径、官网/商店文案和数据边界。
4. 观察窗口：[填写时长]。

## 升级

- 升级对象：[Aviso owner / aviso-backend owner / provider / 商店支持]
- 升级条件：[影响扩大、诊断不清、超过响应目标或涉及隐私安全]
- 准备信息：[incident 链接、版本、脱敏错误分类、部署/商店记录]

## 禁止事项

- 不要求用户在聊天、issue 或截图里提供 API Key、token、私人页面正文或未脱敏数据。
- 不把内部构建、手动 smoke 或后端健康检查扩大写成外部发布事实。
- 不在事故中直接执行商店提交、生产部署或后端写操作，除非 owner 明确批准。
