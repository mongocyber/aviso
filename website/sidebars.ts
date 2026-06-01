import type {SidebarsConfig} from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  guideSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "产品介绍"
    },
    {
      type: "category",
      label: "开始使用",
      collapsed: false,
      items: ["install", "api-keys", "first-use"]
    },
    {
      type: "category",
      label: "功能与边界",
      collapsed: false,
      items: ["core-features", "data-permissions", "known-limitations"]
    },
    {
      type: "category",
      label: "信任与支持",
      collapsed: false,
      items: ["privacy-policy", "support-feedback"]
    }
  ]
};

export default sidebars;
