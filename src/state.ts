export interface Item {
  id: string;
  type: 'item';
  content: string;
}

export interface Group {
  id: string;
  type: 'group';
  content: string;
  items: Item[];
}

export type ListItem = Item | Group;

export const initialData: ListItem[] = [
  { id: "item1", type: "item", content: "Item 1" },
  { id: "item2", type: "item", content: "Item 2" },
  {
    id: "group1",
    type: "group",
    content: "Group 1",
    items: [{ id: "item3", type: "item", content: "Item 3" }],
  },
  {
    id: "group2",
    type: "group",
    content: "Group 2",
    items: [
      { id: "item4", type: "item", content: "Item 4" },
      { id: "item5", type: "item", content: "Item 5" },
    ],
  },
  { id: "item6", type: "item", content: "Item 6" },
];