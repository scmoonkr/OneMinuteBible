export type MenuItem = { label: string; to: string };
export type MenuSection = { key: string; label: string; to: string; description: string; children: MenuItem[] };

// 사이드바와 홈 카드가 함께 쓰는 메뉴 정의.
export const menuSections: MenuSection[] = [
  {
    key: 'bible',
    label: 'Bible',
    to: '/bible',
    description: '성경 본문을 장별로 보고 편집한다.',
    children: [
      { label: 'View', to: '/bible/view' },
      { label: 'Edit', to: '/bible/edit' },
    ],
  },
  {
    key: 'confession',
    label: 'Confession',
    to: '/confession',
    description: '하이델베르크·웨스트민스터 문답을 보고 편집한다.',
    children: [
      { label: 'View', to: '/confession/view' },
      { label: 'Edit', to: '/confession/edit' },
    ],
  },
  {
    key: 'biblehub',
    label: 'BibleHub',
    to: '/biblehub',
    description: '장별 인물·장소·사건을 보고 편집한다.',
    children: [
      { label: 'View', to: '/biblehub/view' },
      { label: 'Edit', to: '/biblehub/edit' },
      { label: 'Topical', to: '/biblehub/topical' },
    ],
  },
];
