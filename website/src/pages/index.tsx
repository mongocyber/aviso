import clsx from "clsx";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";

const highlights = [
  {
    title: "在网页里直接使用 AI",
    description: "选中文字、打开右键菜单、唤起命令面板或复制内容后，不必离开当前页面就能发起解释、翻译、润色和总结。"
  },
  {
    title: "结果留在当前上下文",
    description: "Aviso 使用页面内浮窗展示流式结果，支持复制、保存和继续追问，适合阅读、研究和编辑场景。"
  },
  {
    title: "保守的数据边界",
    description: "Aviso 没有自建后端，不添加遥测或分析 SDK。API Key 加密保存在本地，AI 请求由扩展直连用户选择的 provider。"
  }
];

const gates = [
  "当前是 v0.1 internal dogfood / 内部试用状态，不代表已经公开发布。",
  "OpenAI 和 Anthropic 真实调用尚未完成正式验证。",
  "Chrome 商店提交、最终 package zip、release tag 和回滚点尚未完成。"
];

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Aviso 用户帮助"
      description="Aviso 是一个在当前网页就地调用 AI 的 Chrome 扩展。">
      <main>
        <section className="avisoHero">
          <div className="container">
            <p className="avisoEyebrow">Chrome 扩展 · 用户帮助文档</p>
            <h1>Aviso</h1>
            <p className="avisoLead">
              在网页当前上下文里调用 AI：解释选区、翻译文本、润色内容、总结页面、处理图片线索，并用浮窗留住结果。
            </p>
            <div className="avisoActions">
              <Link className="button button--primary button--lg" to="/docs/intro">
                阅读产品介绍
              </Link>
              <Link className="button button--secondary button--lg" to="/docs/privacy-policy">
                查看隐私政策草案
              </Link>
            </div>
          </div>
        </section>

        <section className="avisoSection">
          <div className="container">
            <div className="avisoGrid">
              {highlights.map((item) => (
                <article className="avisoPanel" key={item.title}>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="avisoSection avisoSectionMuted">
          <div className="container avisoTwoCol">
            <div>
              <p className="avisoEyebrow">发布前说明</p>
              <h2>这份网站用于公开文档准备</h2>
              <p>
                本站把内部事实源改写成面向普通用户和 Chrome 审核人员的帮助文档。它不表示 Aviso 已完成公开发布，也不会替代仓库根目录的内部文档。
              </p>
            </div>
            <ul className="avisoGateList">
              {gates.map((gate) => (
                <li key={gate}>{gate}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </Layout>
  );
}
