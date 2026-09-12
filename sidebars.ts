import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'index',
    {
      type: 'category',
      label: '개발 문서',
      collapsed: false,
      items: [
        'development/architecture',
        'development/api',
      ],
    },
    {
      type: 'category',
      label: '운영 문서',
      collapsed: false,
      items: [
        'operations/deployment',
        'operations/llm-wiki-extension',
      ],
    },
    {
      type: 'category',
      label: '표준/가이드',
      collapsed: false,
      items: [
        'standards/coding',
      ],
    },
    {
      type: 'category',
      label: '의사결정 기록',
      collapsed: false,
      items: [
        'decisions/DEC-001-docusaurus-wiki',
      ],
    },
  ],
};

export default sidebars;
