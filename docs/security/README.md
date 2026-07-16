# Security

Status: `active`
Updated: 2026-07-10

本目录是 Aviso 产品仓库的安全生命周期入口。扩展当前权限、数据流、存储和“不收集”边界的详细实现说明仍以 [`../privacy-and-security.md`](../privacy-and-security.md) 为准；当前能力与门禁状态见 [`../STATE.md`](../STATE.md)。

## 文档分工

- 威胁和残余风险：[`threat-model.md`](./threat-model.md)。
- 数据级别、存储、传输、日志、保留与删除：[`data-classification.md`](./data-classification.md)。
- 扩展权限、BYOK、hosted AI、截图和本地搜索数据流：[`../privacy-and-security.md`](../privacy-and-security.md)。
- 发布、商店、回滚与 owner gate：[`../release/README.md`](../release/README.md)。
- hosted AI 后端安全由 [`aviso-backend`](https://github.com/mongocyber/aviso-backend/tree/main/docs/security) 负责。

## Review Triggers

以下变化必须同时评审威胁模型、数据分类、公开文案和测试：

- manifest permission、host permission、Chrome storage key 或 API Key 保护变化。
- 新 provider、hosted route、OAuth/session、遥测、反馈收集或第三方网络请求。
- 页面正文、选区、截图、剪贴板、浏览历史、书签、完整 URL 或模型输出的处理变化。
- 浏览器自动化、工具执行、远端内容抓取、支付或不可逆用户动作。
- 构建链、商店包、官网反馈 API 或依赖供应链变化。

## Authentication / Authorization

- BYOK 路径不依赖 Aviso 账号；provider 鉴权由用户自己的 API Key 完成。
- hosted AI 使用用户主动发起的 Chrome identity / Google 流程和后端 session；退出 hosted 账号不得删除或暴露 BYOK 配置。
- 扩展页面与 background 的消息必须校验来源、operation 和 payload，不能把网页脚本视为可信调用方。
- 权限或会话语义变化必须有正反例测试和 owner 批准。

## Secrets

- BYOK API Key 只允许保存在 [`../STATE.md`](../STATE.md) 指定的本地存储边界，不进入 sync、日志、文档、测试 fixture 或远端服务。
- hosted provider、OAuth、数据库和部署凭证属于后端/平台 secret，不进入本仓库。
- 发现疑似 secret 时先停止复制和传播，再由 owner 执行轮换与影响评估。
- 当前本地保护不是对受控设备或可读 Chrome profile 的安全边界；不得扩大表述。

## Privacy / Retention / Deletion

数据规则见 [`data-classification.md`](./data-classification.md) 和 [`../privacy-and-security.md`](../privacy-and-security.md)。新增数据类型必须先定级，再明确是否发送给 provider/后端、保存位置、保留窗口、删除入口和公开披露。

## Dependencies / Supply Chain

- 依赖新增需要说明用途、维护状态、许可证、运行时/构建时范围和替代方案。
- 锁文件只能由对应包管理器生成。
- 发布候选必须执行依赖审计、secret scan、manifest/permission 检查和最终 zip 内容复核；入口见 [`../architecture/testing.md`](../architecture/testing.md)。
- 不能自动修复的构建链风险必须在发布证据中记录 owner 接受、隔离措施或上游跟踪，不能被“仅开发依赖”一句话关闭。

## Vulnerability Response

1. 记录受影响版本、可利用条件、用户/数据影响和临时缓解。
2. 涉及 API Key、token、私人页面内容、恶意包或广泛用户影响时进入 [`../operations/incident-response.md`](../operations/incident-response.md)。
3. 修复优先加入回归测试，再生成新候选包并复核权限和敏感数据边界。
4. 如公开文案、隐私政策或商店数据声明受影响，必须同一修复流程更新并由 owner 审核。

## Prompt Injection / Untrusted Content

网页正文、选区、链接文本、模型输出和 provider 错误都属于不可信内容。Aviso 当前只在用户主动触发时把必要上下文发送给所选 AI 路径；不得把网页文本或模型输出当作可以自动执行的指令。未来若加入浏览器自动化、工具调用或跨页 agent，必须先建立独立权限、确认、eval 和停用机制。
