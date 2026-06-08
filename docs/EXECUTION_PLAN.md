# Aviso Execution Plan

Updated: 2026-06-08

## 当前维护目标

保持 Aviso `v0.1 internal dogfood / 内部试用版` 稳定、可构建、可手动验收，并确保文档只描述当前已实现能力和当前边界。

## 执行顺序

1. 先确认当前状态：读取 `README.md`、`STATUS.md`、`RELEASE_CHECKLIST.md`、`docs/README.md` 和相关源码。
2. 明确本次任务范围：功能、文案、测试、文档或验收记录。
3. 只改必要文件，不扩大权限、依赖、数据流或发布范围。
4. 更新与改动匹配的文档。
5. 运行最相关检查。
6. 回报改了什么、检查结果、剩余风险。

## 默认检查

根项目改动默认运行：

```bash
git diff --check
npm test
npx tsc --noEmit
npm run build
```

只改文档时，至少运行：

```bash
git diff --check
```

如果文档涉及已删除路径、权限、命令或用户可见说明，还需要用搜索确认没有旧引用残留。

## 当前验收重点

- 中文 Chrome 下扩展描述和 UI 仍为中文。
- 英文 Chrome 下扩展描述和 UI 为英文。
- 快捷键说明英文正常。
- 权限没有变化。
- 构建通过。
- OpenAI / Anthropic 模型 ID 可以手动编辑。
- 当前文档不再引用已删除的 roadmap、issues、specs、store、design 或 brand 目录。

## 停线条件

以下情况需要先确认，不要直接执行：

- 新增或扩大 manifest permission / host permission。
- 新增依赖、provider、后端、远端服务、遥测或分析 SDK。
- 改 API Key 存储、读取、解密、打印或迁移逻辑。
- 真实 provider API 调用。
- 发布、tag、push、Chrome Web Store workflow 或生产部署。
- 把当前内部试用状态改成公开发布状态。
