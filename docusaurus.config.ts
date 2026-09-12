import type {Config} from '@docusaurus/types';
import type {Preset} from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Dev Wiki',
  tagline: '사내 개발팀 지식 베이스',
  favicon: 'img/favicon.ico',
  url: 'http://100.100.1.100',
  baseUrl: '/wiki/',
  organizationName: 'internal',
  projectName: 'dev_wiki',
  trailingSlash: true,
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  i18n: {
    defaultLocale: 'ko',
    locales: ['ko'],
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          // 초기 저장소에는 Git 커밋 이력이 없을 수 있어 Git 기반 최종 수정일 표시는 비활성화합니다.
          showLastUpdateTime: false,
          showLastUpdateAuthor: false,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      } satisfies Preset.Options,
    ],
  ],
  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en'],
        docsRouteBasePath: '/',
        indexBlog: false,
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],
  themeConfig: {
    navbar: {
      title: 'Dev Wiki',
      items: [
        {to: '/', label: '홈', position: 'left'},
        {to: '/development/architecture/', label: '개발 문서', position: 'left'},
        {to: '/operations/deployment/', label: '운영 문서', position: 'left'},
        {to: '/standards/coding/', label: '표준/가이드', position: 'left'},
        {to: '/decisions/DEC-001-docusaurus-wiki/', label: '의사결정', position: 'left'},
        {type: 'search', position: 'right'},
      ],
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '문서',
          items: [
            {label: '개발 문서', to: '/development/architecture/'},
            {label: '운영 문서', to: '/operations/deployment/'},
            {label: '코딩 표준', to: '/standards/coding/'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Dev Wiki. Internal use only.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
