import { type ListItem, type Group, type Item } from "./state";


export const moveItem = (
  from: number[],
  to: number[],
  items: ListItem[]
): ListItem[] => {
  // return items.reverse();
  console.log('\n\nMOVE ITEM', from, to, items)
  let dataCopy = JSON.parse(JSON.stringify(items));

  let itemToMove: ListItem | undefined;

  const isSameGroup = from.length === 2 && to.length === 2 && from[0] === to[0];

  if (from.length === 1) { // Moving from root
    itemToMove = dataCopy.splice(from[0], 1)[0];
  } else { // Moving from within a group
    const groupFrom = dataCopy[from[0]] as Group;
    itemToMove = groupFrom.items.splice(from[1], 1)[0];
  }

  if (from[0] < to[0] && to.length === 2) {
    to[0] -= 1;
  }


  if (to.length === 1) { // Moving to root
    dataCopy.splice(to[0], 0, itemToMove);
  } else { // Moving to within a group
    // No need to adjust 'to[0]' here because we've already adjusted above if necessary
    const groupTo = dataCopy[to[0]] as Group;
    groupTo.items.splice(to[1] || 0, 0, itemToMove as Item);
  }

  console.log('RETURNED DATA', JSON.stringify(dataCopy, null, 2))
  return dataCopy;

  // let itemToMove: ListItem | undefined;

  // let removedIndex: null | number = null

  // // Extract item from its current position
  // if (from.length === 1) {
  //   itemToMove = data.splice(from[0], 1)[0];
  //   removedIndex = from[0]
  // } else {
  //   let group: Group = data[from[0]] as Group;
  //   itemToMove = group.items.splice(from[1], 1)[0];
  // }
  // console.log('items after removal', [...data])

  // // If the item to move does not exist, return the original data unmodified
  // if (!itemToMove) {
  //   console.log('COULD NOT FIND ITEM TO MOVE')
  //   return items;
  // }

  // // if we removed the item from a location before the destination
  // // we need to adjust the destination index
  // if (removedIndex !== null && to[0] > removedIndex) {
  //   to[0] -= 1
  //   console.log('UPDATED TO INDEX')
  // }

  // console.log('ITEMS', [...data])

  // // Insert item into its new position
  // if (to.length === 1) {
  //   // the item should be added at the top level
  //   data = [
  //     ...data.slice(0, to[0]),
  //     itemToMove,
  //     ...data.slice(to[0]),
  //   ]
  // } else {
  //   // the item should be added to a group
  //   console.log("\n\nItems", items);
  //   let group: Group = data[to[0]] as Group;
  //   console.log("GROUP", data, group, to);
  //   group.items.splice(to[1], 0, itemToMove as Item); // Assumption: 'to' will not point to a non-existent group
  // }

  // console.log("returned data", JSON.stringify(data))
  // return data;


  // if (to === "TOP" || to === "BOTTOM") {
  //   if (from.length === 1) {
  //     itemToMove = data.splice(from[0], 1)[0];
  //   } else {
  //     let group: Group = data[from[0]] as Group;
  //     itemToMove = group.items.splice(from[1], 1)[0];
  //   }
  //   if (to === "TOP") {
  //     return data.splice(0, 0, itemToMove as ListItem);
  //   }
  //   if (to === "BOTTOM") {
  //     return data.splice(0, 0, itemToMove as ListItem);
  //   }
  //   itemToMove = data.splice(from[0], 1)[0];
  //   return data.splice(0, 0, itemToMove as ListItem);
  // }


  // if (to[0] === from[0]) {
  // if (to[0] === from[0]) {
  //   console.log("same group", to, from, data);
  //   return items;
  // }

  // if (from[0] < to[0] && from.length < to.length) {
  // if (from[0] < to[0] && to.length === 2) {
    // if (from[0] < to[0] && from.length === 2 && to.length !== 2) {
    // If we're moving an item to a lower index, we need to adjust the 'to' index
    // if from.length === 2, we're moving an item from a group, so we're not impacting the top-level shape
    // to[0] -= 1;
  // }



};