import type {Config} from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import {themes as prismThemes} from "prism-react-renderer";

const config: Config = {
  title: "Aviso 用户帮助",
  tagline: "在当前网页就地调用 AI 的 Chrome 扩展",
  url: "https://aviso.local",
  baseUrl: "/",
  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn"
    }
  },
  trailingSlash: true,
  i18n: {
    defaultLocale: "zh-Hans",
    locales: ["zh-Hans"]
  },
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "docs"
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css"
        }
      } satisfies Preset.Options
    ]
  ],
  themeConfig: {
    image: "img/aviso-social-card.png",
    navbar: {
      title: "Aviso",
      items: [
        {
          type: "docSidebar",
          sidebarId: "guideSidebar",
          position: "left",
          label: "用户文档"
        },
        {
          to: "/docs/privacy-policy",
          position: "left",
          label: "隐私政策"
        },
        {
          to: "/docs/support-feedback",
          position: "right",
          label: "支持反馈"
        }
      ]
    },
    footer: {
      style: "light",
      links: [
        {
          title: "开始使用",
          items: [
            {
              label: "产品介绍",
              to: "/docs/intro"
            },
            {
              label: "安装 Aviso",
              to: "/docs/install"
            },
            {
              label: "首次使用",
              to: "/docs/first-use"
            }
          ]
        },
        {
          title: "隐私与发布",
          items: [
            {
              label: "隐私政策草案",
              to: "/docs/privacy-policy"
            },
            {
              label: "数据与权限",
              to: "/docs/data-permissions"
            },
            {
              label: "已知限制",
              to: "/docs/known-limitations"
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Aviso. Documentation draft for release preparation.`
    },
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula
    }
  } satisfies Preset.ThemeConfig
};

export default config;
