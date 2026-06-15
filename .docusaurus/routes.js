import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/wiki/search/',
    component: ComponentCreator('/wiki/search/', '9f8'),
    exact: true
  },
  {
    path: '/wiki/',
    component: ComponentCreator('/wiki/', '49f'),
    routes: [
      {
        path: '/wiki/',
        component: ComponentCreator('/wiki/', '03d'),
        routes: [
          {
            path: '/wiki/',
            component: ComponentCreator('/wiki/', 'ba6'),
            routes: [
              {
                path: '/wiki/decisions/DEC-001-docusaurus-wiki/',
                component: ComponentCreator('/wiki/decisions/DEC-001-docusaurus-wiki/', 'ada'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/wiki/development/api/',
                component: ComponentCreator('/wiki/development/api/', '70e'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/wiki/development/architecture/',
                component: ComponentCreator('/wiki/development/architecture/', 'baa'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/wiki/operations/deployment/',
                component: ComponentCreator('/wiki/operations/deployment/', '25c'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/wiki/standards/coding/',
                component: ComponentCreator('/wiki/standards/coding/', '15a'),
                exact: true,
                sidebar: "docs"
              },
              {
                path: '/wiki/',
                component: ComponentCreator('/wiki/', '5a3'),
                exact: true,
                sidebar: "docs"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
