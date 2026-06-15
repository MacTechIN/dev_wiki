import type {Config} from '@docusaurus/types';
import type {Preset} from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Dev Wiki',
  tagline: '?? ??? ?? ???',
  favicon: 'img/favicon.ico',
  url: 'http://100.83.34.122',
  baseUrl: '/wiki/',
  organizationName: 'internal',
  projectName: 'dev_wiki',
  trailingSlash: true,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
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
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
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
        {to: '/', label: '?', position: 'left'},
        {to: '/development/architecture/', label: '?? ??', position: 'left'},
        {to: '/operations/deployment/', label: '?? ??', position: 'left'},
        {to: '/standards/coding/', label: '??/???', position: 'left'},
        {to: '/decisions/DEC-001-docusaurus-wiki/', label: '????', position: 'left'},
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
          title: '??',
          items: [
            {label: '?? ??', to: '/development/architecture/'},
            {label: '?? ??', to: '/operations/deployment/'},
            {label: '?? ??', to: '/standards/coding/'},
          ],
        },
      ],
      copyright: `Copyright ? ${new Date().getFullYear()} Dev Wiki. Internal use only.`,
    },
    prism: {
      theme: require('prism-react-renderer').themes.github,
      darkTheme: require('prism-react-renderer').themes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
