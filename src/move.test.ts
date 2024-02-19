import { moveItem } from "./move";
import { initialData } from "./state";

describe("moveItem", () => {
  it("moves item 0 to item 1", () => {
    const result = moveItem([0], [1], initialData);
    expect(result[0].id).toBe("item2");
  })
  it('moves an item within the same group', () => {
    const result = moveItem([3, 0], [3, 1], initialData);
    // @ts-ignore
    expect(result[3].items[0].id).toBe('item5')
    // @ts-ignore
    expect(result[3].items[1].id).toBe('item4')
  });


})