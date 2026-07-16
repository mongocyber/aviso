## 变更说明

- 这个 PR 做了什么、为什么：

## 文档同步

行为 / 能力（二选一）：

- [ ] 本 PR 不改变行为 / 能力。
- [ ] 本 PR 改变行为 / 能力，`docs/STATE.md` 已同步。

契约 / 规则：

- [ ] 接口、storage schema、manifest/permission、数据流或持久化契约如有变化，相关 `docs/architecture/` / `docs/security/` / ADR 已更新。
- [ ] 未触碰 `CLAUDE.md` 红线；若触碰，已附 owner 批准链接。

## 条件式检查

每项必须勾选并写证据，或明确说明为什么不适用；不要机械全勾。

- [ ] 测试证据：行为变化有测试；bug fix 有回归测试。证据/不适用原因：
- [ ] 候选包 / 商店 / 官网 / rollback：已更新 release 说明或确认无影响。证据/不适用原因：
- [ ] 监控 / 支持 / runbook：已更新 operations/incident 入口或确认无影响。证据/不适用原因：
- [ ] 安全 / 隐私 / 权限 / 供应链：已完成对应 review/scan/文档更新。证据/不适用原因：
- [ ] AI 产品影响：已更新 eval、model/provider、prompt/output 安全、成本/延迟或确认无影响。证据/不适用原因：

## 已运行检查

```text
填写实际运行的命令与结果；外部门禁写 blocked/pending，不伪造 pass。
```

## Owner-gated actions

- 本 PR 是否需要商店提交、生产部署、真实 provider/OAuth、权限扩大、tag/release 或其他 owner 动作：
