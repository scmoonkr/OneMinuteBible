export type BibleStory = {
  id: string
  title: string
}

export type BibleBook = {
  id: string
  title: string
  subtitle: string
  stories: BibleStory[]
  readTarget?: {
    bookNo: number
    chapterNo: number
  }
}

export type BibleGroup = {
  id: string
  title: string
  subtitle: string
  books: BibleBook[]
}

export type BibleTestament = {
  id: 'ot' | 'nt'
  title: string
  subtitle: string
  groups: BibleGroup[]
}

export const bibleExplorer: BibleTestament[] = [
  {
    id: 'ot',
    title: '구약',
    subtitle: '시작과 약속, 역사와 기다림을 따라 읽습니다.',
    groups: [
      {
        id: 'torah',
        title: '모세오경',
        subtitle: '하나님과 시작되는 이야기',
        books: [
          {
            id: 'genesis',
            title: '창세기',
            subtitle: '시작의 이야기',
            readTarget: { bookNo: 1, chapterNo: 1 },
            stories: [
              { id: 'creation-of-heaven-earth', title: '천지창조' },
              { id: 'creation-of-humanity', title: '인간 창조' },
              { id: 'fall', title: '타락' },
              { id: 'noah', title: '노아와 방주' },
              { id: 'babel', title: '바벨탑' },
            ],
          },
          {
            id: 'exodus',
            title: '출애굽기',
            subtitle: '구원의 시작',
            readTarget: { bookNo: 2, chapterNo: 1 },
            stories: [
              { id: 'calling-of-moses', title: '모세의 부르심' },
              { id: 'ten-plagues', title: '열 가지 재앙' },
              { id: 'red-sea', title: '홍해' },
              { id: 'law', title: '율법' },
            ],
          },
          {
            id: 'leviticus',
            title: '레위기',
            subtitle: '거룩의 기준',
            readTarget: { bookNo: 3, chapterNo: 1 },
            stories: [
              { id: 'sacrifice', title: '제사' },
              { id: 'holiness', title: '정결' },
              { id: 'community', title: '거룩한 공동체' },
            ],
          },
          {
            id: 'numbers',
            title: '민수기',
            subtitle: '광야의 여정',
            readTarget: { bookNo: 4, chapterNo: 1 },
            stories: [
              { id: 'complaint-and-disobedience', title: '불평과 불순종' },
              { id: 'forty-years', title: '40년의 시간' },
            ],
          },
          {
            id: 'deuteronomy',
            title: '신명기',
            subtitle: '다시 들려주는 말씀',
            readTarget: { bookNo: 5, chapterNo: 1 },
            stories: [
              { id: 'law-summary', title: '율법 정리' },
              { id: 'before-the-promised-land', title: '약속의 땅을 앞두고' },
            ],
          },
        ],
      },
      {
        id: 'history',
        title: '역사서',
        subtitle: '하나님의 백성 안에서 이어지는 이야기',
        books: [
          {
            id: 'joshua',
            title: '여호수아',
            subtitle: '정복과 약속',
            stories: [
              { id: 'canaan', title: '가나안 정복' },
              { id: 'jericho', title: '여리고' },
            ],
          },
          {
            id: 'judges',
            title: '사사기',
            subtitle: '반복되는 실패와 구원',
            stories: [
              { id: 'judges-cycle', title: '사사들의 이야기' },
            ],
          },
          {
            id: 'ruth',
            title: '룻기',
            subtitle: '작은 이야기 속 큰 은혜',
            stories: [
              { id: 'ruth-and-naomi', title: '룻과 나오미' },
            ],
          },
        ],
      },
      {
        id: 'wisdom',
        title: '시가서',
        subtitle: '시와 감정, 지혜의 고백',
        books: [
          {
            id: 'psalms',
            title: '시편',
            subtitle: '기도와 찬양',
            stories: [
              { id: 'thanks', title: '감사' },
              { id: 'rest', title: '안식' },
              { id: 'praise', title: '찬양' },
            ],
          },
          {
            id: 'proverbs',
            title: '잠언',
            subtitle: '지혜의 말씀',
            stories: [
              { id: 'choice-of-the-heart', title: '마음의 선택' },
              { id: 'way-of-wisdom', title: '지혜의 길' },
            ],
          },
        ],
      },
      {
        id: 'prophets',
        title: '예언서',
        subtitle: '경고와 약속, 회복의 시선',
        books: [
          {
            id: 'isaiah',
            title: '이사야',
            subtitle: '구원과 회복',
            stories: [
              { id: 'judgment', title: '심판' },
              { id: 'messiah-promise', title: '메시야의 약속' },
            ],
          },
          {
            id: 'jeremiah',
            title: '예레미야',
            subtitle: '눈물의 예언자',
            stories: [
              { id: 'call-to-repentance', title: '회개 촉구' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'nt',
    title: '신약',
    subtitle: '예수님과 복음, 교회와 소망으로 이어집니다.',
    groups: [
      {
        id: 'gospels',
        title: '복음서',
        subtitle: '예수님의 삶과 길',
        books: [
          {
            id: 'matthew',
            title: '마태복음',
            subtitle: '왕으로 오신 예수',
            stories: [
              { id: 'birth', title: '탄생' },
              { id: 'ministry', title: '공생애' },
              { id: 'cross', title: '십자가' },
            ],
          },
          {
            id: 'mark',
            title: '마가복음',
            subtitle: '곧게 가는 예수',
            stories: [
              { id: 'miracles', title: '기적' },
              { id: 'mission', title: '사역' },
            ],
          },
        ],
      },
      {
        id: 'acts',
        title: '사도행전',
        subtitle: '교회의 시작',
        books: [
          {
            id: 'acts-book',
            title: '사도행전',
            subtitle: '복음의 확장',
            stories: [
              { id: 'holy-spirit', title: '성령' },
              { id: 'missionary-journeys', title: '선교' },
            ],
          },
        ],
      },
      {
        id: 'letters',
        title: '서신서',
        subtitle: '믿음을 가르치는 편지',
        books: [
          {
            id: 'romans',
            title: '로마서',
            subtitle: '믿음으로 사는 길',
            stories: [
              { id: 'salvation', title: '구원' },
              { id: 'new-life', title: '새 삶' },
            ],
          },
        ],
      },
      {
        id: 'revelation',
        title: '계시록',
        subtitle: '마지막과 새 시작',
        books: [
          {
            id: 'revelation-book',
            title: '요한계시록',
            subtitle: '완성과 새 하늘',
            stories: [
              { id: 'judgment', title: '심판' },
              { id: 'new-heaven-earth', title: '새 하늘과 새 땅' },
            ],
          },
        ],
      },
    ],
  },
];
