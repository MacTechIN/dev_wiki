import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'index',
    {
      type: 'category',
      label: '?? ??',
      collapsed: false,
      items: [
        'development/architecture',
        'development/api',
      ],
    },
    {
      type: 'category',
      label: '?? ??',
      collapsed: false,
      items: [
        'operations/deployment',
        'operations/llm-wiki-extension',
      ],
    },
    {
      type: 'category',
      label: '??/???',
      collapsed: false,
      items: [
        'standards/coding',
      ],
    },
    {
      type: 'category',
      label: '???? ??',
      collapsed: false,
      items: [
        'decisions/DEC-001-docusaurus-wiki',
      ],
    },
  ],
};

export default sidebars;
