/** 화면에서만 쓰는 목록 항목. 같은 글이 있어도 구분하도록 key를 붙인다. */
export type StringListItem = { key: number; value: string };

let nextKey = 0;

export function createStringListItem(value: string): StringListItem {
  nextKey += 1;
  return { key: nextKey, value };
}

export function toStringListItems(values: string[]): StringListItem[] {
  return values.map(createStringListItem);
}

export function toStringListValues(items: StringListItem[]): string[] {
  return items.map((item) => item.value);
}
